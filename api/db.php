<?php
$host = 'localhost'; 
$db   = 'relevamiento_digital'; // O el prefijo que te dé Bluehost (ej. usuari_relevamiento_digital)
$user = 'TU_USUARIO_DB';
$pass = 'TU_CONTRASEÑA_DB';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     throw new \PDOException($e->getMessage(), (int)$e->getCode());
}
?>
B. api/submit.php (Para guardar los datos)

<?php
require_once 'db.php';

header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (!$data) {
        echo json_encode(["status" => "error", "message" => "No se recibieron datos"]);
        die();
    }

    // Extraer campos principales (que van en columnas nativas)
    $nombre_puesto = $data['nombre_puesto'] ?? '';
    $numero_puesto = $data['numero_puesto'] ?? '';
    $categoria = $data['categoria'] ?? '';
    $nombre_contacto = $data['nombre_contacto'] ?? '';
    $rol_contacto = $data['rol_contacto'] ?? '';
    $telefono = $data['telefono'] ?? '';
    $email = $data['email'] ?? '';

    // El resto de los campos los guardamos como JSON
    $respuestas_extra = $data;
    unset($respuestas_extra['nombre_puesto'], $respuestas_extra['numero_puesto'], $respuestas_extra['categoria']);
    unset($respuestas_extra['nombre_contacto'], $respuestas_extra['rol_contacto'], $respuestas_extra['telefono'], $respuestas_extra['email']);

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
C. api/get_metrics.php (El que leerá los datos para tu dashboard)

<?php
require_once 'db.php';
header("Content-Type: application/json; charset=UTF-8");

try {
    $stmt = $pdo->query("SELECT * FROM comercios ORDER BY id DESC");
    $comercios = $stmt->fetchAll();

    $result = [];
    foreach ($comercios as $row) {
        $row['respuestas_json'] = json_decode($row['respuestas_json'], true);
        $result[] = $row;
    }
    echo json_encode(["status" => "success", "data" => $result]);
} catch (Exception $e) {
    echo json_encode(["status" => "error", "message" => "Error al obtener datos: " . $e->getMessage()]);
}
?>