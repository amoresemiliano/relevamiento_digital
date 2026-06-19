<?php
// api/get_metrics.php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");

try {
    // Obtenemos todos los comercios ordenados por el más reciente
    $stmt = $pdo->query("SELECT * FROM comercios ORDER BY id DESC");
    $comercios = $stmt->fetchAll();

    $result = [];
    foreach ($comercios as $row) {
        // Decodificamos el JSON que guardamos en respuestas_json para enviarlo estructurado
        if (!empty($row['respuestas_json'])) {
            $row['respuestas_json'] = json_decode($row['respuestas_json'], true);
        } else {
            $row['respuestas_json'] = [];
        }
        $result[] = $row;
    }

    echo json_encode(["status" => "success", "data" => $result]);

} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Error al obtener datos: " . $e->getMessage()]);
}
?>