#!/usr/bin/env node
/**
 * deploy.js — заливка файлов сайта на хостинг sprinthost по SFTP.
 *
 * Соединение через curl (sftp://), с повторными попытками — сеть до сервера
 * нестабильна, часть попыток обрывается по таймауту.
 *
 * Использование:
 *   node deploy.js file1.html file2.html ...      — залить только эти файлы
 *   node deploy.js --all                          — залить вообще все файлы репозитория
 *                                                    (кроме .git/.deploy/.claude/node_modules)
 *
 * Данные подключения читаются из .deploy/credentials.json (в git не попадает):
 *   { "host": "...", "user": "...", "password": "...", "remotePath": "/domains/.../public_html/" }
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = __dirname;
const CREDS_PATH = path.join(ROOT, '.deploy', 'credentials.json');

if (!fs.existsSync(CREDS_PATH)) {
  console.error('Не найден .deploy/credentials.json с данными подключения.');
  process.exit(1);
}
const creds = JSON.parse(fs.readFileSync(CREDS_PATH, 'utf8'));

const EXCLUDE_DIRS = new Set(['.git', '.deploy', '.claude', 'node_modules']);

function walk(dir, base, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    const rel = path.join(base, entry.name);
    if (entry.isDirectory()) walk(full, rel, out);
    else out.push(rel.split(path.sep).join('/'));
  }
}

let files;
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Укажите файлы для загрузки или --all для полной заливки.');
  process.exit(1);
} else if (args[0] === '--all') {
  files = [];
  walk(ROOT, '', files);
} else {
  files = args;
}

const remoteBase = creds.remotePath.replace(/\/+$/, '') + '/public_html/';

let ok = 0, fail = 0;
for (const relFile of files) {
  const localFile = path.join(ROOT, relFile);
  if (!fs.existsSync(localFile)) {
    console.error(`ПРОПУЩЕН (нет локально): ${relFile}`);
    fail++;
    continue;
  }
  const remoteDir = path.posix.dirname(remoteBase + relFile) + '/';
  const url = `sftp://${creds.host}${remoteDir}`;
  try {
    execFileSync('curl', [
      '-sS', '-k',
      '-T', localFile,
      url,
      '--user', `${creds.user}:${creds.password}`,
      '--ftp-create-dirs',
      '--connect-timeout', '10',
      '--retry', '8',
      '--retry-delay', '2',
      '--retry-all-errors'
    ], { stdio: 'inherit' });
    console.log(`✓ ${relFile}`);
    ok++;
  } catch (e) {
    console.error(`✗ ОШИБКА: ${relFile}`);
    fail++;
  }
}

console.log(`\nГотово: ${ok} загружено, ${fail} с ошибкой.`);
if (fail > 0) process.exit(1);
