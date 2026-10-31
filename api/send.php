<?php
/* ==========================================================================
   St. Paul Apostolic Church of Jesus Christ — form mailer for cPanel hosting
   --------------------------------------------------------------------------
   Used ONLY when content/site.json has:
       "forms": { "provider": "php", "endpoint": "api/send.php", ... }

   BEFORE GOING LIVE:
   1. Set $TO_EMAIL below to the church inbox that should receive requests.
   2. Set $FROM_EMAIL to an address on the SAME domain as the website
      (for example no-reply@yourchurchdomain.org). Many hosts reject mail
      "from" other domains. Create that address in cPanel > Email Accounts.
   3. Submit a test prayer request and confirm it arrives (check spam too).
   ========================================================================== */

$TO_EMAIL   = 'CHANGE-ME@example.org';
$FROM_EMAIL = 'no-reply@example.org';
$SITE_NAME  = 'St. Paul Apostolic Church of Jesus Christ';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

// Spam honeypot: real visitors never fill this hidden field.
if (!empty($_POST['company'])) {
    echo json_encode(['ok' => true]);
    exit;
}

function clean($v, $max = 5000) {
    $v = trim((string)($v ?? ''));
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    return mb_substr(strip_tags($v), 0, $max);
}
function one_line($v) { return preg_replace('/[\r\n]+/', ' ', clean($v, 200)); }

$form = one_line($_POST['form-name'] ?? 'website-form');
$email = filter_var(one_line($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);

if ($form === 'prayer-request') {
    $name = one_line(($_POST['first_name'] ?? '') . ' ' . ($_POST['last_name'] ?? ''));
    $body = "Prayer request from the website\n\n"
          . "Name:  $name\n"
          . "Email: " . ($email ?: '(not valid)') . "\n"
          . "Phone: " . one_line($_POST['phone'] ?? '') . "\n"
          . "Keep private: " . (!empty($_POST['keep_private']) ? 'YES — please keep confidential' : 'No') . "\n\n"
          . "Request:\n" . clean($_POST['prayer_request'] ?? '') . "\n";
    $subject = 'Prayer Request — ' . $name;
    $required = [$name, clean($_POST['prayer_request'] ?? '')];
} elseif ($form === 'praise-report') {
    $name = one_line($_POST['name'] ?? '');
    $body = "Praise report / testimony from the website\n\n"
          . "Name:  $name\n"
          . "Email: " . ($email ?: '(not valid)') . "\n"
          . "May share with congregation: " . (!empty($_POST['may_share']) ? 'Yes' : 'No') . "\n\n"
          . "Testimony:\n" . clean($_POST['testimony'] ?? '') . "\n";
    $subject = 'Praise Report — ' . $name;
    $required = [$name, clean($_POST['testimony'] ?? '')];
} else {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Unknown form']);
    exit;
}

foreach ($required as $r) {
    if ($r === '' || $r === ' ') {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => 'Missing required fields']);
        exit;
    }
}

$headers  = "From: $SITE_NAME <$FROM_EMAIL>\r\n";
if ($email) { $headers .= "Reply-To: $email\r\n"; }
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

$sent = mail($TO_EMAIL, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Mail could not be sent']);
}
