<?php
/**
 * Анонимная статистика приложения «Сойка»: только счётчики событий по дням.
 *
 * POST {"days": {"2026-10-02": {"launch": 3, "quick_test": 1}}} — прибавить к счётчикам.
 * GET  ?k=<ключ из stats-key.php> — таблица для автора.
 *
 * IP-адреса, идентификаторы устройств и любые данные абонентов не принимаются и не хранятся.
 */

header('Cache-Control: no-store');

$dataDir = __DIR__ . '/stats-data';
$dataFile = $dataDir . '/stats.json';
$zone = new DateTimeZone('Europe/Moscow');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: text/plain; charset=utf-8');
    $raw = file_get_contents('php://input', false, null, 0, 20000);
    $input = json_decode($raw, true);
    if (!is_array($input) || !isset($input['days']) || !is_array($input['days'])) {
        http_response_code(400);
        exit('bad request');
    }

    if (!is_dir($dataDir)) {
        @mkdir($dataDir, 0750, true);
    }
    $handle = fopen($dataFile, 'c+');
    if (!$handle) {
        http_response_code(500);
        exit('storage');
    }
    flock($handle, LOCK_EX);
    $data = json_decode(stream_get_contents($handle), true);
    if (!is_array($data)) {
        $data = [];
    }

    $now = new DateTime('now', $zone);
    $accepted = 0;
    foreach ($input['days'] as $day => $events) {
        if (!is_string($day) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $day) || !is_array($events)) {
            continue;
        }
        $date = DateTime::createFromFormat('!Y-m-d', $day, $zone);
        if (!$date) {
            continue;
        }
        // Часы телефона могут врать, но не на месяцы: такие дни — мусор
        $ageDays = ($now->getTimestamp() - $date->getTimestamp()) / 86400;
        if ($ageDays < -2 || $ageDays > 90) {
            continue;
        }
        foreach ($events as $name => $count) {
            if (!is_string($name) || !preg_match('/^[a-z0-9_.]{1,40}$/', $name)) {
                continue;
            }
            $count = (int)$count;
            if ($count < 1 || $count > 1000) {
                continue;
            }
            if (++$accepted > 300) {
                break 2;
            }
            $data[$day][$name] = ($data[$day][$name] ?? 0) + $count;
        }
    }

    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($data));
    fflush($handle);
    flock($handle, LOCK_UN);
    fclose($handle);
    exit('ok');
}

// Просмотр — только с ключом; без него страницы как будто нет
$key = @include __DIR__ . '/stats-key.php';
if (!is_string($key) || $key === '' || !isset($_GET['k']) || !hash_equals($key, (string)$_GET['k'])) {
    http_response_code(404);
    exit;
}

header('Content-Type: text/html; charset=utf-8');
$data = is_file($dataFile) ? json_decode((string)file_get_contents($dataFile), true) : [];
if (!is_array($data)) {
    $data = [];
}
krsort($data);

$columns = [
    'install' => 'Новые установки',
    'existing' => 'Обновились со старой версии',
    'active' => 'Пользовались за день',
    'launch' => 'Запуски',
    'login_first' => 'Первый вход в кабинет',
    'quick_test' => 'Быстрая проверка',
    'long_test' => 'Долгая проверка',
    'trace' => 'Трассировка',
    'indicators' => 'Лампочки терминала',
    'speed' => 'Скорость и Wi-Fi',
    'router_setup' => 'Настройка роутера',
    'payment' => 'Оплата',
    'promised' => 'Обещанный платёж',
    'max' => 'Переходы в МАКС',
    'update' => 'Обновление из приложения',
];

$totals = [];
$versions = [];
foreach ($data as $day => $events) {
    foreach ($events as $name => $count) {
        $totals[$name] = ($totals[$name] ?? 0) + $count;
        if (strpos($name, 'v_') === 0) {
            $versions[substr($name, 2)][$day] = $count;
        }
    }
}
uksort($versions, 'version_compare');
$versions = array_reverse($versions, true);

function cell($value) {
    return $value ? (string)$value : '<span class="zero">·</span>';
}
?>
<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Статистика «Сойки»</title>
<style>
    :root { --ink: #1f1d1a; --soft: #6b665c; --line: #e3ddd0; --bg: #fbf7ec; --accent: #154e47; }
    body { margin: 0; padding: 24px 16px; font: 15px/1.45 -apple-system, "Segoe UI", Roboto, sans-serif; color: var(--ink); background: var(--bg); }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 17px; margin: 32px 0 10px; }
    p { color: var(--soft); margin: 0 0 16px; }
    .scroll { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; background: #fff; }
    table { border-collapse: collapse; font-variant-numeric: tabular-nums; min-width: 100%; }
    th, td { padding: 7px 10px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
    th { font-size: 12px; font-weight: 600; color: var(--soft); vertical-align: bottom; white-space: normal; min-width: 70px; }
    th:first-child, td:first-child { text-align: left; position: sticky; left: 0; background: #fff; }
    tr.total td { font-weight: 700; background: #f3efe3; }
    tr.total td:first-child { background: #f3efe3; }
    .zero { color: #c9c2b2; }
</style>
</head>
<body>
<h1>Статистика приложения «Сойка»</h1>
<p>Только счётчики по дням (московское время), без данных абонентов. «Пользовались за день» — сколько телефонов открывали приложение в этот день.</p>

<div class="scroll">
<table>
    <tr>
        <th>День</th>
        <?php foreach ($columns as $label): ?><th><?= htmlspecialchars($label) ?></th><?php endforeach; ?>
    </tr>
    <tr class="total">
        <td>Всего</td>
        <?php foreach (array_keys($columns) as $name): ?><td><?= cell($totals[$name] ?? 0) ?></td><?php endforeach; ?>
    </tr>
    <?php foreach ($data as $day => $events): ?>
    <tr>
        <td><?= htmlspecialchars(date('d.m.Y', strtotime($day))) ?></td>
        <?php foreach (array_keys($columns) as $name): ?><td><?= cell($events[$name] ?? 0) ?></td><?php endforeach; ?>
    </tr>
    <?php endforeach; ?>
</table>
</div>

<?php if ($versions): ?>
<h2>Версии у тех, кто пользовался</h2>
<div class="scroll">
<table>
    <tr><th>Версия</th><th>Всего телефоно-дней</th><th>Последний день</th></tr>
    <?php foreach ($versions as $version => $days): krsort($days); ?>
    <tr>
        <td><?= htmlspecialchars($version) ?></td>
        <td><?= array_sum($days) ?></td>
        <td><?= htmlspecialchars(date('d.m.Y', strtotime(array_key_first($days)))) ?> — <?= reset($days) ?></td>
    </tr>
    <?php endforeach; ?>
</table>
</div>
<?php endif; ?>
</body>
</html>
