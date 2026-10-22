<?php
declare(strict_types=1);
function analyticsDb(): PDO {
    $dir = getenv('ANALYTICS_DATA_DIR') ?: '/var/www/analytics-data';
    if (!is_dir($dir)) mkdir($dir, 0700, true);
    $db = new PDO('sqlite:' . $dir . '/events.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $db->exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000');
    $db->exec('CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, started TEXT NOT NULL, version TEXT NOT NULL, device TEXT NOT NULL, qa INTEGER NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS events (sid TEXT NOT NULL, seq INTEGER NOT NULL, time_ms INTEGER NOT NULL, kind TEXT NOT NULL, target TEXT NOT NULL, value REAL NOT NULL, x REAL NOT NULL, y REAL NOT NULL, PRIMARY KEY(sid,seq))');
    return $db;
}
