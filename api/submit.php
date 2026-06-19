<?php
// api/submit.php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        echo json_encode(["status" => "error", "message" => "No se recibieron datos"]);
        die();
    }

    // Extraer campos principales usando los nombres correctos del form simplificado
    $nombre_puesto = $data['nombre_puesto'] ?? '';
    $numero_puesto = $data['ubicacion_puesto'] ?? ($data['numero_puesto'] ?? ''); // Fallbacks to support both
    $categoria = $data['categoria'] ?? '';
    $nombre_contacto = $data['responsable'] ?? ($data['nombre_contacto'] ?? '');
    $rol_contacto = $data['rol_contacto'] ?? 'N/A'; // no longer in the form, setting to N/A
    $telefono = $data['telefono'] ?? '';
    $email = $data['email'] ?? '';

    // El resto de los campos los guardamos como JSON
    $respuestas_extra = $data;
    unset($respuestas_extra['nombre_puesto'], $respuestas_extra['ubicacion_puesto'], $respuestas_extra['numero_puesto'], $respuestas_extra['categoria']);
    unset($respuestas_extra['responsable'], $respuestas_extra['nombre_contacto'], $respuestas_extra['rol_contacto'], $respuestas_extra['telefono'], $respuestas_extra['email']);

    $respuestas_json = json_encode($respuestas_extra, JSON_UNESCAPED_UNICODE);

    try {
        $stmt = $pdo->prepare("INSERT INTO comercios 
            (nombre_puesto, numero_puesto, categoria, nombre_contacto, rol_contacto, telefono, email, respuestas_json) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        $stmt->execute([
            $nombre_puesto, $numero_puesto, $categoria, $nombre_contacto, $rol_contacto, $telefono, $email, $respuestas_json
        ]);

        echo json_encode(["status" => "success", "message" => "Diagnóstico guardado correctamente."]);
    } catch (Exception $e) {
        echo json_encode(["status" => "error", "message" => "Error al guardar en BD: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Método no permitido"]);
}
?>