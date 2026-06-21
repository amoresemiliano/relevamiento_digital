<?php
// Mostrar errores para depuración en tu entorno
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Evitar CORS si el HTML está en otro dominio (Ajustar en producción)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Authorization, Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Incluir configuración de base de datos
require_once 'db.php';

// OBTENER Y VERIFICAR JWT
$headers = apache_request_headers();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';

if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    http_response_code(401);
    echo json_encode(["error" => "Token no proporcionado o formato inválido"]);
    return;
}

$jwt = $matches[1];
$tokenParts = explode('.', $jwt);

if (count($tokenParts) != 3) {
    http_response_code(401);
    echo json_encode(["error" => "Token inválido"]);
    return;
}

// Decodificar Base64Url
function base64url_decode($data) {
    return base64_decode(str_pad(strtr($data, '-_', '+/'), strlen($data) % 4, '=', STR_PAD_RIGHT));
}

$header = json_decode(base64url_decode($tokenParts[0]), true);
$payload = json_decode(base64url_decode($tokenParts[1]), true);
$signature_provided = base64url_decode($tokenParts[2]);

// 1. Obtener llaves públicas de Google
$certsJson = file_get_contents('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
$certs = json_decode($certsJson, true);

if (!isset($header['kid']) || !isset($certs[$header['kid']])) {
    http_response_code(401);
    echo json_encode(["error" => "Key ID no encontrado"]);
    return;
}

$publicKey = $certs[$header['kid']];

// 2. Verificar Firma Criptográfica RSA
$dataToVerify = $tokenParts[0] . '.' . $tokenParts[1];
$verified = openssl_verify($dataToVerify, $signature_provided, $publicKey, OPENSSL_ALGO_SHA256);

if ($verified !== 1) {
    http_response_code(401);
    echo json_encode(["error" => "Firma de token inválida"]);
    return;
}

// 3. Verificar expiración
if (isset($payload['exp']) && $payload['exp'] < time()) {
    http_response_code(401);
    echo json_encode(["error" => "El token ha expirado"]);
    return;
}

// 4. Verificar usuario autorizado
$email = isset($payload['email']) ? $payload['email'] : '';
$allowed_emails = ['vegendigital@gmail.com', 'gerencia@mercadomaravillas.com'];

if (!in_array($email, $allowed_emails)) {
    http_response_code(403);
    echo json_encode(["error" => "Usuario no autorizado. Contacte al administrador."]);
    return;
}

// Si la validación es exitosa, consultar BD
try {
    // Seleccionamos las columnas
    $stmt = $pdo->query("SELECT * FROM comercios ORDER BY id DESC");
    $comercios = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = [];
    foreach ($comercios as $row) {
        $row['respuestas_json'] = json_decode($row['respuestas_json'], true);
        $result[] = $row;
    }

    echo json_encode(["status" => "success", "data" => $result]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Error de base de datos: " . $e->getMessage()]);
}
?>
