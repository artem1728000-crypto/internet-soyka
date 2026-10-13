<?php
/**
 * Общая база бригад: коды домофонов в МКД и телефоны сотрудников.
 * Пополняют все монтажники; доступ — по общему паролю из baza-key.php (в git не попадает).
 *
 * Заголовок X-Key: <пароль> — обязателен для всех запросов.
 * GET               — вся база: {"items":[...], "now": <мс>}
 * POST {"items":[…]} — добавить/изменить записи по id (удаление — "del": true), ответ как у GET.
 *
 * Запись: id, type ("door" | "person" | "equip"), для door — addr, entr, code, note;
 * для person — name, phone, role, note; для equip — name, group, price, bonus, bonus5, bonus9, note
 * (цена для абонента и бонус за штуку при 1–4 / 5–8 / >8 шт. в месяц);
 * для olt — town, street, house, olt, port, cab, note (какой BDCOM/VSOL и порт обслуживает дом; без данных абонентов);
 * для muff — town, olt, port, num, split, lat, lon, place, abon (подключённые адреса), note. by — кто правил (имя из приложения), at — время сервера.
 * Удалённые записи хранятся пометкой del ещё 180 дней, чтобы удаление дошло до всех телефонов.
 */

header('Cache-Control: no-store');
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

$keyFile = __DIR__ . '/baza-key.php';
$key = is_file($keyFile) ? (require $keyFile) : '';
$given = $_SERVER['HTTP_X_KEY'] ?? '';
if (!is_string($key) || strlen($key) < 8 || !is_string($given) || !hash_equals($key, $given)) {
    sleep(2); // перебор пароля — медленно
    http_response_code(403);
    exit('{"error":"key"}');
}

$dataDir = __DIR__ . '/baza-data';
$dataFile = $dataDir . '/baza.json';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0750, true);
}
$handle = fopen($dataFile, 'c+');
if (!$handle) {
    http_response_code(500);
    exit('{"error":"storage"}');
}

$nowMs = (int)round(microtime(true) * 1000);

function readDb($handle): array
{
    rewind($handle);
    $db = json_decode(stream_get_contents($handle), true);
    return is_array($db) ? $db : [];
}

function reply(array $db, int $nowMs): void
{
    echo json_encode(['items' => array_values($db), 'now' => $nowMs], JSON_UNESCAPED_UNICODE);
}

function clean($v, int $max): string
{
    $s = is_scalar($v) ? trim((string)$v) : '';
    $s = preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $s) ?? '';
    return mb_substr($s, 0, $max);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    flock($handle, LOCK_SH);
    reply(readDb($handle), $nowMs);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('{"error":"method"}');
}

$input = json_decode(file_get_contents('php://input', false, null, 0, 200000), true);
if (!is_array($input) || !isset($input['items']) || !is_array($input['items']) || count($input['items']) > 500) {
    http_response_code(400);
    exit('{"error":"bad request"}');
}

flock($handle, LOCK_EX);
$db = readDb($handle);

foreach ($input['items'] as $it) {
    if (!is_array($it)) {
        continue;
    }
    $id = clean($it['id'] ?? '', 64);
    $type = $it['type'] ?? '';
    if (!preg_match('/^[A-Za-z0-9-]{8,64}$/', $id) || !in_array($type, ['door', 'person', 'equip', 'olt', 'muff'], true)) {
        continue;
    }
    $rec = ['id' => $id, 'type' => $type, 'by' => clean($it['by'] ?? '', 60), 'at' => $nowMs];
    if (!empty($it['del'])) {
        $rec['del'] = true;
    } elseif ($type === 'door') {
        $rec['addr'] = clean($it['addr'] ?? '', 200);
        $rec['entr'] = clean($it['entr'] ?? '', 30);
        $rec['code'] = clean($it['code'] ?? '', 60);
        $rec['note'] = clean($it['note'] ?? '', 300);
        if ($rec['addr'] === '') {
            continue;
        }
    } elseif ($type === 'olt') {
        foreach (['town' => 60, 'street' => 80, 'house' => 30, 'olt' => 20, 'port' => 20, 'cab' => 120, 'note' => 300] as $k => $max) {
            $rec[$k] = clean($it[$k] ?? '', $max);
        }
        if ($rec['street'] === '' || $rec['house'] === '') {
            continue;
        }
    } elseif ($type === 'muff') {
        foreach (['town' => 60, 'olt' => 20, 'port' => 20, 'num' => 20, 'split' => 20, 'place' => 120,
                     'abon' => 1500, 'note' => 300] as $k => $max) {
            $rec[$k] = clean($it[$k] ?? '', $max);
        }
        foreach (['lat', 'lon'] as $k) {
            $v = (float)($it[$k] ?? 0);
            $rec[$k] = ($v >= -180 && $v <= 180) ? round($v, 6) : 0;
        }
        if ($rec['olt'] === '' && $rec['place'] === '') {
            continue;
        }
    } elseif ($type === 'equip') {
        $rec['name'] = clean($it['name'] ?? '', 120);
        $rec['group'] = clean($it['group'] ?? '', 60);
        foreach (['price', 'bonus', 'bonus5', 'bonus9'] as $k) {
            $rec[$k] = max(0, min(1000000, (int)($it[$k] ?? 0)));
        }
        $rec['note'] = clean($it['note'] ?? '', 300);
        if ($rec['name'] === '') {
            continue;
        }
    } else {
        $rec['name'] = clean($it['name'] ?? '', 120);
        $rec['phone'] = clean($it['phone'] ?? '', 40);
        $rec['role'] = clean($it['role'] ?? '', 120);
        $rec['note'] = clean($it['note'] ?? '', 300);
        if ($rec['name'] === '') {
            continue;
        }
    }
    $db[$id] = $rec;
}

// Пометки удаления старше 180 дней больше не нужны
$cutoff = $nowMs - 180 * 86400 * 1000;
foreach ($db as $id => $rec) {
    if (!empty($rec['del']) && ($rec['at'] ?? 0) < $cutoff) {
        unset($db[$id]);
    }
}
if (count($db) > 20000) {
    http_response_code(507);
    exit('{"error":"full"}');
}

ftruncate($handle, 0);
rewind($handle);
fwrite($handle, json_encode($db, JSON_UNESCAPED_UNICODE));
fflush($handle);
reply($db, $nowMs);
