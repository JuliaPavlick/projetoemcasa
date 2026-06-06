<?php
// =============================================
// CHÁ DE REVELAÇÃO DA FLÁVIA — API Backend
// Arquivo: api.php
// =============================================

define('DB_HOST', 'localhost');
define('DB_NAME', 'u405215841_cha_flavia');
define('DB_USER', 'u405215841_cha_flavia');
define('DB_PASS', 'Juju131531ca');
define('DB_CHARSET', 'utf8mb4');

define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('UPLOAD_URL', 'uploads/');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }
    return $pdo;
}

function responder(array $dados, int $codigo = 200): void {
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function erro(string $mensagem, int $codigo = 400): void {
    responder(['erro' => $mensagem], $codigo);
}

// Busca filhos de um convidado
function getFilhos(PDO $db, int $convidado_id): array {
    $stmt = $db->prepare('SELECT id, nome FROM filhos WHERE convidado_id = ? ORDER BY id');
    $stmt->execute([$convidado_id]);
    return $stmt->fetchAll();
}

$acao   = $_GET['acao'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];
$body   = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    switch ($acao) {

        // ──────────────────────────────────────
        // LOGIN
        // ──────────────────────────────────────
        case 'login':
            $nome      = trim($_GET['nome'] ?? '');
            $device_id = trim($_GET['device_id'] ?? '');
            if (!$nome || !$device_id) erro('Parâmetros inválidos.');

            $db   = getDB();
            $stmt = $db->prepare('SELECT * FROM convidados WHERE LOWER(nome) = LOWER(?) LIMIT 1');
            $stmt->execute([$nome]);
            $convidado = $stmt->fetch();

            if (!$convidado) erro('Nome não encontrado.', 404);

            if ($convidado['device_id'] && $convidado['device_id'] !== $device_id) {
                erro('Esse nome já foi acessado em outro dispositivo.', 403);
            }

            if (!$convidado['device_id']) {
                $db->prepare('UPDATE convidados SET device_id = ? WHERE id = ?')
                   ->execute([$device_id, $convidado['id']]);
            }

            $palpite = $db->prepare('SELECT voto FROM palpites WHERE convidado_id = ?');
            $palpite->execute([$convidado['id']]);
            $voto = $palpite->fetchColumn();

            $presenca_stmt = $db->prepare('SELECT confirmado FROM presencas WHERE convidado_id = ?');
            $presenca_stmt->execute([$convidado['id']]);
            $presenca = $presenca_stmt->fetchColumn();

            $filhos = getFilhos($db, $convidado['id']);

            responder([
                'id'       => $convidado['id'],
                'nome'     => $convidado['nome'],
                'relacao'  => $convidado['relacao'],
                'is_admin' => (bool) $convidado['is_admin'],
                'votou'    => $voto !== false,
                'voto'     => $voto ?: null,
                'presenca' => $presenca ?: null,
                'filhos'   => $filhos,
            ]);

        // ──────────────────────────────────────
        // VOTAR
        // ──────────────────────────────────────
        case 'votar':
            if ($metodo !== 'POST') erro('Método inválido.');
            $id   = (int) ($body['convidado_id'] ?? 0);
            $voto = $body['voto'] ?? '';
            if (!$id || !in_array($voto, ['menino', 'menina'])) erro('Dados inválidos.');

            $db = getDB();
            $db->prepare('INSERT INTO palpites (convidado_id, voto) VALUES (?, ?)
                          ON DUPLICATE KEY UPDATE voto = VALUES(voto)')
               ->execute([$id, $voto]);

            responder(['ok' => true]);

        // ──────────────────────────────────────
        // PRESENÇA
        // ──────────────────────────────────────
        case 'presenca':
            if ($metodo !== 'POST') erro('Método inválido.');
            $id         = (int) ($body['convidado_id'] ?? 0);
            $confirmado = $body['confirmado'] ?? '';
            if (!$id || !in_array($confirmado, ['sim', 'nao'])) erro('Dados inválidos.');

            $db = getDB();
            $db->prepare('INSERT INTO presencas (convidado_id, confirmado) VALUES (?, ?)
                          ON DUPLICATE KEY UPDATE confirmado = VALUES(confirmado)')
               ->execute([$id, $confirmado]);

            responder(['ok' => true]);

        // ──────────────────────────────────────
        // ESTADO GERAL
        // ──────────────────────────────────────
        case 'estado':
            $db   = getDB();
            $cfgs = $db->query('SELECT chave, valor FROM configuracoes')->fetchAll();
            $config = [];
            foreach ($cfgs as $c) $config[$c['chave']] = $c['valor'];

            $votos = $db->query('SELECT voto, COUNT(*) as total FROM palpites GROUP BY voto')->fetchAll();
            $contagem = ['menino' => 0, 'menina' => 0];
            foreach ($votos as $v) $contagem[$v['voto']] = (int) $v['total'];

            responder([
                'revelacao'    => $config['revelacao'] ?? 'locked',
                'local_evento' => $config['local_evento'] ?? '',
                'data_evento'  => $config['data_evento'] ?? '2025-06-28',
                'votos'        => $contagem,
                'total_votos'  => $contagem['menino'] + $contagem['menina'],
            ]);

        // ──────────────────────────────────────
        // LISTAR CONVIDADOS (com filhos e contagem de presença)
        // ──────────────────────────────────────
        case 'convidados':
            $db   = getDB();
            $lista = $db->query('
                SELECT c.id, c.nome, c.relacao, c.is_admin,
                       p.voto,
                       pr.confirmado
                FROM convidados c
                LEFT JOIN palpites p   ON p.convidado_id  = c.id
                LEFT JOIN presencas pr ON pr.convidado_id = c.id
                ORDER BY c.id
            ')->fetchAll();

            // Para cada convidado, busca filhos e calcula peso de presença
            foreach ($lista as &$item) {
                $item['is_admin'] = (bool) $item['is_admin'];
                $item['filhos']   = getFilhos($db, $item['id']);
                // Peso: 1 (própria pessoa) + número de filhos
                $item['peso_presenca'] = 1 + count($item['filhos']);
            }

            responder($lista);

        // ──────────────────────────────────────
        // ADICIONAR CONVIDADO (com filhos opcionais)
        // POST Body: { nome, relacao, filhos: ["Ana", "Pedro"] }
        // ──────────────────────────────────────
        case 'adicionar_convidado':
            if ($metodo !== 'POST') erro('Método inválido.');
            $nome     = trim($body['nome'] ?? '');
            $relacao  = trim($body['relacao'] ?? '');
            $is_admin = !empty($body['is_admin']) ? 1 : 0;
            $filhos   = $body['filhos'] ?? [];
            if (!$nome || !$relacao) erro('Dados inválidos.');

            $db  = getDB();
            $dup = $db->prepare('SELECT id FROM convidados WHERE LOWER(nome) = LOWER(?)');
            $dup->execute([$nome]);
            if ($dup->fetch()) erro('Convidado já cadastrado.');

            $db->prepare('INSERT INTO convidados (nome, relacao, is_admin) VALUES (?, ?, ?)')->execute([$nome, $relacao, $is_admin]);
            $novo_id = (int) $db->lastInsertId();

            // Se for admin, confirmar presença automaticamente
            if ($is_admin) {
                $db->prepare('INSERT INTO presencas (convidado_id, confirmado) VALUES (?, ?) ON DUPLICATE KEY UPDATE confirmado = VALUES(confirmado)')
                   ->execute([$novo_id, 'sim']);
            }

            // Inserir filhos
            if (!empty($filhos) && is_array($filhos)) {
                $stmtFilho = $db->prepare('INSERT INTO filhos (convidado_id, nome) VALUES (?, ?)');
                foreach ($filhos as $filho) {
                    $nomeFilho = trim($filho);
                    if ($nomeFilho) $stmtFilho->execute([$novo_id, $nomeFilho]);
                }
            }

            responder(['ok' => true, 'id' => $novo_id]);

        // ──────────────────────────────────────
        // ADICIONAR FILHO A CONVIDADO EXISTENTE
        // POST Body: { convidado_id, nome }
        // ──────────────────────────────────────
        case 'adicionar_filho':
            if ($metodo !== 'POST') erro('Método inválido.');
            $convidado_id = (int) ($body['convidado_id'] ?? 0);
            $nome_filho   = trim($body['nome'] ?? '');
            if (!$convidado_id || !$nome_filho) erro('Dados inválidos.');

            $db = getDB();
            $db->prepare('INSERT INTO filhos (convidado_id, nome) VALUES (?, ?)')->execute([$convidado_id, $nome_filho]);

            responder(['ok' => true, 'id' => (int) $db->lastInsertId()]);

        // ──────────────────────────────────────
        // REMOVER FILHO
        // DELETE api.php?acao=remover_filho&id=3
        // ──────────────────────────────────────
        case 'remover_filho':
            if ($metodo !== 'DELETE') erro('Método inválido.');
            $id = (int) ($_GET['id'] ?? 0);
            if (!$id) erro('ID inválido.');

            $db = getDB();
            $db->prepare('DELETE FROM filhos WHERE id = ?')->execute([$id]);

            responder(['ok' => true]);

        // ──────────────────────────────────────
        // REMOVER CONVIDADO
        // ──────────────────────────────────────
        case 'remover_convidado':
            if ($metodo !== 'DELETE') erro('Método inválido.');
            $id = (int) ($_GET['id'] ?? 0);
            if (!$id) erro('ID inválido.');

            $db = getDB();
            $db->prepare('DELETE FROM convidados WHERE id = ? AND is_admin = 0')->execute([$id]);

            responder(['ok' => true]);

        // ──────────────────────────────────────
        // CONFIGURAR
        // ──────────────────────────────────────
        case 'configurar':
            if ($metodo !== 'POST') erro('Método inválido.');
            $chave     = trim($body['chave'] ?? '');
            $valor     = trim($body['valor'] ?? '');
            $permitidas = ['revelacao', 'local_evento', 'data_evento'];
            if (!in_array($chave, $permitidas)) erro('Chave inválida.');

            $db = getDB();
            $db->prepare('INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
                          ON DUPLICATE KEY UPDATE valor = VALUES(valor)')
               ->execute([$chave, $valor]);

            responder(['ok' => true]);

        // ──────────────────────────────────────
        // ENVIAR FOTO
        // ──────────────────────────────────────
        case 'enviar_foto':
            if ($metodo !== 'POST') erro('Método inválido.');
            $id = (int) ($_POST['convidado_id'] ?? 0);
            if (!$id) erro('ID inválido.');
            if (empty($_FILES['foto'])) erro('Nenhuma foto enviada.');

            if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

            $arquivo = $_FILES['foto'];
            $ext     = strtolower(pathinfo($arquivo['name'], PATHINFO_EXTENSION));
            $tipos   = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (!in_array($ext, $tipos)) erro('Formato inválido.');
            if ($arquivo['size'] > 10 * 1024 * 1024) erro('Arquivo muito grande (máx 10MB).');

            $nome_arquivo = uniqid('foto_', true) . '.' . $ext;
            $destino      = UPLOAD_DIR . $nome_arquivo;
            if (!move_uploaded_file($arquivo['tmp_name'], $destino)) erro('Erro ao salvar.', 500);

            $db = getDB();
            $db->prepare('INSERT INTO fotos (convidado_id, nome_arquivo, caminho) VALUES (?, ?, ?)')
               ->execute([$id, $nome_arquivo, UPLOAD_URL . $nome_arquivo]);

            responder(['ok' => true, 'caminho' => UPLOAD_URL . $nome_arquivo]);

        // ──────────────────────────────────────
        // LISTAR FOTOS
        // ──────────────────────────────────────
        case 'fotos':
            $db    = getDB();
            $fotos = $db->query('
                SELECT f.id, f.caminho, f.enviado_em, c.nome AS enviado_por
                FROM fotos f
                JOIN convidados c ON c.id = f.convidado_id
                ORDER BY f.enviado_em DESC
            ')->fetchAll();

            responder($fotos);

        default:
            erro('Ação não encontrada.', 404);
    }

} catch (PDOException $e) {
    erro('Erro no banco de dados: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    erro('Erro interno: ' . $e->getMessage(), 500);
}
