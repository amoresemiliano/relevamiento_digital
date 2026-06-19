<?php
// api/get_metrics.php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");

// FIREBASE PROJECT ID (Reemplazar con el tuyo si es diferente)
$firebaseProjectId = "mm-relevamiento-digital";

// OBTENER LA CABECERA AUTHORIZATION
$headers = null;
if (isset($_SERVER['Authorization'])) {
    $headers = trim($_SERVER["Authorization"]);
}
else if (isset($_SERVER['HTTP_AUTHORIZATION'])) { // Nginx or fast CGI
    $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
} elseif (function_exists('apache_request_headers')) {
    $requestHeaders = apache_request_headers();
    $requestHeaders = array_combine(array_map('ucwords', array_keys($requestHeaders)), array_values($requestHeaders));
    if (isset($requestHeaders['Authorization'])) {
        $headers = trim($requestHeaders['Authorization']);
    }
}

// Extraer el token del header Bearer
$jwt = null;
if (!empty($headers)) {
    if (preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
        $jwt = $matches[1];
    }
}

if (!$jwt) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Falta Token de Acceso. Acceso Denegado."]);
    exit();
}

// VALIDAR EL TOKEN DE FIREBASE VERIFICANDO LA FIRMA (Signature)
try {
    // 1. Dividir el JWT (Header.Payload.Signature)
    $tokenParts = explode('.', $jwt);
    if (count($tokenParts) != 3) {
        throw new Exception("Token con formato incorrecto");
    }

    $headerStr = base64_decode(strtr($tokenParts[0], '-_', '+/'));
    $payloadStr = base64_decode(strtr($tokenParts[1], '-_', '+/'));
    $signature = base64_decode(strtr($tokenParts[2], '-_', '+/'));

    $header = json_decode($headerStr, true);
    $payload = json_decode($payloadStr, true);

    // 2. Obtener las llaves públicas de Google
    $keys_url = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    $keys_json = file_get_contents($keys_url);
    if (!$keys_json) {
        throw new Exception("No se pudieron obtener las llaves públicas de Firebase.");
    }
    $keys = json_decode($keys_json, true);

    // 3. Buscar la llave correcta usando el kid del header
    if (!isset($header['kid']) || !isset($keys[$header['kid']])) {
        throw new Exception("Llave pública (kid) no encontrada.");
    }
    $publicKey = $keys[$header['kid']];

    // 4. Verificar la firma RSA
    $dataToSign = $tokenParts[0] . '.' . $tokenParts[1];
    $verify = openssl_verify($dataToSign, $signature, $publicKey, OPENSSL_ALGO_SHA256);
    if ($verify !== 1) {
        throw new Exception("Firma del token inválida o forjada.");
    }

    // 5. Validaciones básicas del payload
    if (!$payload || !isset($payload['exp']) || !isset($payload['aud']) || !isset($payload['iss'])) {
        throw new Exception("Payload del token inválido.");
    }

    // Verificar si el token expiró
    if (time() >= $payload['exp']) {
        throw new Exception("El token ha expirado.");
    }

    // Verificar el proyecto
    if ($payload['aud'] !== $firebaseProjectId || $payload['iss'] !== 'https://securetoken.google.com/' . $firebaseProjectId) {
        throw new Exception("El token no pertenece a este proyecto de Firebase.");
    }

    // Autorización (RBAC) basada en el email
    $email = isset($payload['email']) ? strtolower($payload['email']) : '';
    $allowed_emails = ['vegendigital@gmail.com', 'gerencia@mercadomaravillas.com'];

    if (!in_array($email, $allowed_emails)) {
        http_response_code(403);
        echo json_encode(["status" => "error", "message" => "Usuario no autorizado para acceder a esta API."]);
        exit();
    }

} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Token inválido: " . $e->getMessage()]);
    exit();
}

// --- SI EL TOKEN Y EL USUARIO SON VÁLIDOS, PROCEDEMOS CON LA BASE DE DATOS ---

try {
    // Si el usuario es el gerente, no le entregamos la DB real para evitar exponer datos PII
    // y cumplir al máximo con GDPR.
    if ($email === 'gerencia@mercadomaravillas.com') {
        // Enviar solo array vacío para que el frontend dispare los Mock Data
        echo json_encode(["status" => "success", "data" => []]);
        exit();
    }

    // Es admin (vegendigital@gmail.com), obtiene todos los datos reales.
    $stmt = $pdo->query("SELECT * FROM comercios ORDER BY id DESC");
    $comercios = $stmt->fetchAll();

    $result = [];
    foreach ($comercios as $row) {
        $row['respuestas_json'] = json_decode($row['respuestas_json'], true);
        $result[] = $row;
    }

    echo json_encode(["status" => "success", "data" => $result]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Error al obtener datos: " . $e->getMessage()]);
}
?>
