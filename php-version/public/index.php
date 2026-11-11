<?php
declare(strict_types=1);

/**
 * Front controller: semua halaman diakses lewat  index.php?r=<route>
 */
require __DIR__ . '/../src/bootstrap.php';

$routes = [
    'dashboard'     => 'page_dashboard',
    'login'         => 'page_login',
    'logout'        => 'action_logout',
    'doc.new'       => 'page_doc_form',
    'doc.edit'      => 'page_doc_form',
    'doc.save'      => 'action_doc_save',
    'doc.delete'    => 'action_doc_delete',
    'doc.status'    => 'action_doc_status',
    'doc.convert'   => 'action_doc_convert',
    'doc.print'     => 'page_doc_print',
    'settings'      => 'page_settings',
    'settings.save' => 'action_settings_save',
];

$route = (string)($_GET['r'] ?? 'dashboard');
if (!isset($routes[$route])) {
    abort(404);
}
if ($route !== 'login') {
    require_login();
}
$routes[$route]();
