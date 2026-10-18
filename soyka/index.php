<?php
// Постоянная ссылка на текущую версию приложения «Сойка»: internet-kanevskoy.ru/soyka/
// Запасной канал на случай, если Яндекс.Диск не отвечает. Какой файл текущий —
// написано в latest.json рядом; его же читает само приложение при проверке обновлений.
$latest = json_decode((string) @file_get_contents(__DIR__ . '/latest.json'), true);
$file = is_array($latest) ? (string) ($latest['file'] ?? '') : '';

header('Cache-Control: no-store');
if (!preg_match('/^[A-Za-z0-9._-]+\.apk$/', $file) || !is_file(__DIR__ . '/' . $file)) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Файл приложения сейчас обновляется — попробуйте через несколько минут.';
    exit;
}
header('Location: /soyka/' . $file, true, 302);
