<?php
declare(strict_types=1);
require __DIR__ . '/store.php';
header('Cache-Control: no-store');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
// Do not accept cross-site browser submissions. No cookies or identifiers are stored.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== explode(':', $_SERVER['HTTP_HOST'] ?? '')[0]) { http_response_code(403); exit; }
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 48000) { http_response_code(413); exit; }
$raw = file_get_contents('php://input', false, null, 0, 48001);
if (strlen($raw) > 48000) { http_response_code(413); exit; }
$p = json_decode($raw, true);
if (!is_array($p) || !preg_match('/^[a-f0-9]{32}$/D', (string)($p['id'] ?? '')) || ($p['version'] ?? '') !== 'exp01-compact-form' || !in_array($p['device'] ?? '', ['mobile','desktop'], true) || !is_array($p['events'] ?? null) || count($p['events']) > 100) { http_response_code(400); exit; }
$kinds = ['page','click','focus','dwell','scroll','cta','form_view','form_start','submit_view','validation_error','submit','submit_error','success','end'];
$targets = '/^(?:page|hero|about|program|injuries|legal|photo|instructors|pricing|registration|footer|cta-(?:hero|program|[123])|field-(?:name|phone|email|purpose)|submit|(?:feature|module|injury|instructor|tariff)-[1-6])$/D';
$rows = [];
foreach ($p['events'] as $e) {
    if (!is_array($e) || !is_int($e['seq'] ?? null) || $e['seq'] < 1 || $e['seq'] > 3000 || !in_array($e['kind'] ?? '', $kinds, true) || !preg_match($targets, (string)($e['target'] ?? ''))) { http_response_code(400); exit; }
    foreach (['ms','value','x','y'] as $key) if (!isset($e[$key]) || !is_numeric($e[$key]) || !is_finite((float)$e[$key])) { http_response_code(400); exit; }
    if ($e['ms'] < 0 || $e['ms'] > 86400000 || $e['value'] < 0 || $e['value'] > 86400000 || $e['x'] < -1 || $e['x'] > 1 || $e['y'] < -1 || $e['y'] > 1) { http_response_code(400); exit; }
    $rows[] = [$p['id'], $e['seq'], (int)$e['ms'], $e['kind'], $e['target'], (float)$e['value'], (float)$e['x'], (float)$e['y']];
}
try {
    $db = analyticsDb(); $db->beginTransaction();
    $db->prepare('INSERT OR IGNORE INTO sessions VALUES (?, ?, ?, ?, ?)')->execute([$p['id'], gmdate('Y-m-d\TH:i:s\Z'), $p['version'], $p['device'], !empty($p['qa']) ? 1 : 0]);
    $q = $db->prepare('INSERT OR IGNORE INTO events VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    foreach ($rows as $row) $q->execute($row);
    $db->commit(); http_response_code(204);
} catch (Throwable $e) { if (isset($db) && $db->inTransaction()) $db->rollBack(); http_response_code(503); }
