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

    // Срок хранения по политике конфиденциальности — не дольше 3 лет
    $oldest = (clone $now)->modify('-3 years')->format('Y-m-d');
    foreach (array_keys($data) as $day) {
        if ((string)$day < $oldest) {
            unset($data[$day]);
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
    'welcome_login' => 'Приветствие: «Войти»',
    'welcome_skip' => 'Приветствие: без входа',
    'quick_test' => 'Быстрая проверка',
    'long_test' => 'Долгая проверка',
    'trace' => 'Трассировка',
    'indicators' => 'Лампочки терминала',
    'speed' => 'Скорость и Wi-Fi',
    'wifi_air' => 'Соседние сети Wi-Fi',
    'whitelist' => 'Белые списки',
    'router_setup' => 'Настройка роутера',
    'router_video' => 'Видео: настройка роутера',
    'payment' => 'Оплата',
    'promised' => 'Обещанный платёж',
    'max' => 'Переходы в МАКС',
    'update' => 'Обновление из приложения',
    'update_site' => 'Обновление: скачивание с сайта',
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

// По месяцам: «active_month» приходит раз в месяц с телефона, поэтому сумма — разные телефоны
$months = [];
foreach ($data as $day => $events) {
    $month = substr($day, 0, 7);
    foreach (['active_month', 'src_rustore', 'src_apk', 'install', 'login_first', 'quick_test', 'max'] as $name) {
        $months[$month][$name] = ($months[$month][$name] ?? 0) + ($events[$name] ?? 0);
    }
}
krsort($months);

// Итоги быстрой проверки и сколько после них всё равно написали в МАКС
$verdicts = [
    'ok' => 'Интернет работает',
    'restricted' => 'Работает с ограничениями',
    'financial' => 'Только сеть Сойки (неоплата)',
    'no_uplink' => 'Нет связи с интернетом',
    'dns' => 'Не работает DNS',
    'no_router' => 'Роутер не выдал адрес',
    'vpn' => 'Включён VPN',
    'mobile' => 'На мобильном интернете',
    'offline' => 'Нет подключения к сети',
];

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

<h2>По месяцам</h2>
<p>«Пользовались за месяц» и источник установки считаются с версии 3.5: каждый телефон — один раз в месяц.</p>
<div class="scroll">
<table>
    <tr><th>Месяц</th><th>Пользовались за месяц</th><th>Из RuStore</th><th>Файлом с Диска</th><th>Новые установки</th><th>Первый вход в кабинет</th><th>Быстрая проверка</th><th>Переходы в МАКС</th></tr>
    <?php foreach ($months as $month => $m): ?>
    <tr>
        <td><?= htmlspecialchars(date('m.Y', strtotime($month . '-01'))) ?></td>
        <?php foreach (['active_month', 'src_rustore', 'src_apk', 'install', 'login_first', 'quick_test', 'max'] as $name): ?><td><?= cell($m[$name]) ?></td><?php endforeach; ?>
    </tr>
    <?php endforeach; ?>
</table>
</div>

<h2>Итоги быстрой проверки</h2>
<p>Сколько раз проверка показала каждый итог и сколько раз после него в течение получаса всё равно написали в МАКС. Считается с версии 3.5.</p>
<div class="scroll">
<table>
    <tr><th>Итог</th><th>Проверок</th><th>Потом написали</th><th>Доля</th></tr>
    <?php foreach ($verdicts as $kind => $label): $qt = $totals['qt_' . $kind] ?? 0; $mx = $totals['mx_' . $kind] ?? 0; ?>
    <tr>
        <td><?= htmlspecialchars($label) ?></td>
        <td><?= cell($qt) ?></td>
        <td><?= cell($mx) ?></td>
        <td><?= $qt ? round(100 * $mx / $qt) . '%' : cell(0) ?></td>
    </tr>
    <?php endforeach; ?>
</table>
</div>

<h2>По дням</h2>

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
