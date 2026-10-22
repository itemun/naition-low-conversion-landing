<?php
declare(strict_types=1);
session_start();
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
if (empty($_SESSION['orders_admin'])) {
    http_response_code(401);
    echo '<!doctype html><html lang="ru"><meta charset="utf-8"><title>Аналитика — вход</title><p>Для просмотра отчёта <a href="orders.php">войдите в существующую админку заявок</a>, затем вернитесь на эту страницу.</p></html>';
    exit;
}
session_write_close();
if (isset($_GET['export'])) {
    header('Content-Type: application/json; charset=utf-8');
    require dirname(__DIR__) . '/telemetry/store.php';
    try {
        $db = analyticsDb();
        $sessions = $db->query('SELECT * FROM sessions ORDER BY started DESC LIMIT 5000')->fetchAll();
        $events = $db->query('SELECT * FROM events WHERE sid IN (SELECT id FROM sessions ORDER BY started DESC LIMIT 5000) ORDER BY sid,seq')->fetchAll();
        echo json_encode(['generated_at'=>gmdate('c'),'sessions'=>$sessions,'events'=>$events,'limit'=>5000], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    } catch (Throwable $e) { http_response_code(503); echo '{"error":"Не удалось прочитать аналитику"}'; }
    exit;
}
?>
<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Карта поведения — курс первой помощи</title>
<link rel="stylesheet" href="analytics.css"><script src="analytics.js" defer></script></head>
<body><main><header><p class="eyebrow">КУРС ПЕРВОЙ ПОМОЩИ / АНАЛИТИКА</p><h1>От просмотра к заявке</h1><p>Клики, видимость секций и последовательность действий. Без записи содержимого полей.</p><a href="?export=1" download="analytics.json">Скачать данные перед Redeploy</a> · <button id="refresh">Обновить</button></header>
<p id="status" role="status">Загружаем данные…</p>
<section class="filters"><label>Версия<select id="version"></select></label><label>Экран<select id="device"><option value="">Все</option><option>desktop</option><option>mobile</option></select></label><label>Результат<select id="outcome"><option value="">Все</option><option value="yes">С заявкой</option><option value="no">Без подтверждённой заявки</option></select></label><label>Начало, UTC<input id="from" type="datetime-local"></label><label>Конец, UTC<input id="to" type="datetime-local"></label><label class="check"><input id="qa" type="checkbox">Включить ручные проверки</label></section>
<div id="summary" class="summary"></div>
<section><h2>Этапы заявки</h2><p>Загрузки страницы с событием. Это не строгая последовательная воронка: к форме можно попасть без кнопки.</p><div id="funnel"></div></section>
<section><h2>Карта просмотра секций</h2><p>Секция видима, если занимает не менее половины доступной для неё высоты экрана. Время учитывается только в активной вкладке, с шагом около секунды.</p><div id="sections"></div></section>
<section><h2>Карта кликов по элементам</h2><p>Каждый элемент приведён к прямоугольнику 0–100%. Цвет показывает плотность кликов внутри выбранного элемента; он не отражает чтение или намерение.</p><label>Элемент<select id="target"></select></label><div class="heat-wrap"><svg id="heat" viewBox="0 0 600 240" role="img" aria-label="Распределение кликов внутри элемента"></svg></div><p id="heat-note"></p><div id="clicks"></div></section>
<section><h2>С заявкой и без неё</h2><p>Сравнение групп помогает находить гипотезы, но само по себе не доказывает причинность.</p><div id="compare"></div></section>
<section><h2>Последовательность одного визита</h2><label>Загрузка страницы<select id="session"></select></label><div id="timeline"></div></section>
<footer>Одна загрузка страницы = один случайный ID. Доставка событий может быть неполной; отсутствие success не доказывает отказ. Итог сверяйте с симулятором и БД заявок. Отчёт включает последние 5 000 загрузок. Redeploy может удалить эти данные — сохраните JSON заранее.</footer></main></body></html>
