<?php
// =============================================
// CHÁ DE REVELAÇÃO DA FLÁVIA — API Backend
// Arquivo: api.php
// =============================================

// ── CONFIGURAÇÕES DO BANCO ──────────────────
// Altere aqui com seus dados de acesso MySQL
define('DB_HOST', 'localhost');
define('DB_NAME', 'cha_flavia');
define('DB_USER', 'root');       // seu usuário MySQL
define('DB_PASS', '');           // sua senha MySQL
define('DB_CHARSET', 'utf8mb4');

// ── PASTA DE UPLOAD DE FOTOS ────────────────
define('UPLOAD_DIR', __DIR__ . '/uploads/');
define('UPLOAD_URL', 'uploads/');

// ── CORS & HEADERS ──────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── CONEXÃO ─────────────────────────────────
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

// ── RESPOSTA ─────────────────────────────────
function responder(array $dados, int $codigo = 200): void {
    http_response_code($codigo);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function erro(string $mensagem, int $codigo = 400): void {
    responder(['erro' => $mensagem], $codigo);
}

// ── ROTEADOR ─────────────────────────────────
$acao = $_GET['acao'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true) ?? [];

try {
    switch ($acao) {

        // ──────────────────────────────────────
        // LOGIN: valida nome e retorna convidado
        // GET api.php?acao=login&nome=Julia&device_id=abc123
        // ──────────────────────────────────────
        case 'login':
            $nome      = trim($_GET['nome'] ?? '');
            $device_id = trim($_GET['device_id'] ?? '');
            if (!$nome || !$device_id) erro('Parâmetros inválidos.');

            $db = getDB();
            $stmt = $db->prepare('SELECT * FROM convidados WHERE LOWER(nome) = LOWER(?) LIMIT 1');
            $stmt->execute([$nome]);
            $convidado = $stmt->fetch();

            if (!$convidado) erro('Nome não encontrado.', 404);

            // Verificar se já está vinculado a outro dispositivo
            if ($convidado['device_id'] && $convidado['device_id'] !== $device_id) {
                erro('Esse nome já foi acessado em outro dispositivo.', 403);
            }

            // Vincular dispositivo se ainda não vinculado
            if (!$convidado['device_id']) {
                $db->prepare('UPDATE convidados SET device_id = ? WHERE id = ?')
                   ->execute([$device_id, $convidado['id']]);
                $convidado['device_id'] = $device_id;
            }

            // Buscar palpite e presença
            $palpite = $db->prepare('SELECT voto FROM palpites WHERE convidado_id = ?');
            $palpite->execute([$convidado['id']]);
            $voto = $palpite->fetchColumn();

            $presenca_stmt = $db->prepare('SELECT confirmado FROM presencas WHERE convidado_id = ?');
            $presenca_stmt->execute([$convidado['id']]);
            $presenca = $presenca_stmt->fetchColumn();

            responder([
                'id'       => $convidado['id'],
                'nome'     => $convidado['nome'],
                'relacao'  => $convidado['relacao'],
                'is_admin' => (bool) $convidado['is_admin'],
                'votou'    => $voto !== false,
                'voto'     => $voto ?: null,
                'presenca' => $presenca ?: null,
            ]);

        // ──────────────────────────────────────
        // VOTAR: registra palpite do convidado
        // POST api.php?acao=votar
        // Body: { convidado_id, voto: "menino"|"menina" }
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
        // PRESENÇA: confirma ou recusa presença
        // POST api.php?acao=presenca
        // Body: { convidado_id, confirmado: "sim"|"nao" }
        // ──────────────────────────────────────
        case 'presenca':
            if ($metodo !== 'POST') erro('Método inválido.');
            $id          = (int) ($body['convidado_id'] ?? 0);
            $confirmado  = $body['confirmado'] ?? '';
            if (!$id || !in_array($confirmado, ['sim', 'nao'])) erro('Dados inválidos.');

            $db = getDB();
            $db->prepare('INSERT INTO presencas (convidado_id, confirmado) VALUES (?, ?)
                          ON DUPLICATE KEY UPDATE confirmado = VALUES(confirmado)')
               ->execute([$id, $confirmado]);

            responder(['ok' => true]);

        // ──────────────────────────────────────
        // ESTADO GERAL: retorna tudo para o app
        // GET api.php?acao=estado
        // ──────────────────────────────────────
        case 'estado':
            $db = getDB();

            // Configurações
            $cfgs = $db->query('SELECT chave, valor FROM configuracoes')->fetchAll();
            $config = [];
            foreach ($cfgs as $c) $config[$c['chave']] = $c['valor'];

            // Palpites (total, menino, menina)
            $votos = $db->query('
                SELECT voto, COUNT(*) as total
                FROM palpites
                GROUP BY voto
            ')->fetchAll();
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
        // ADMIN — LISTA CONVIDADOS
        // GET api.php?acao=convidados
        // ──────────────────────────────────────
        case 'convidados':
            $db = getDB();
            $lista = $db->query('
                SELECT c.id, c.nome, c.relacao, c.is_admin,
                       p.voto,
                       pr.confirmado
                FROM convidados c
                LEFT JOIN palpites p  ON p.convidado_id  = c.id
                LEFT JOIN presencas pr ON pr.convidado_id = c.id
                ORDER BY c.id
            ')->fetchAll();

            foreach ($lista as &$item) {
                $item['is_admin'] = (bool) $item['is_admin'];
            }

            responder($lista);

        // ──────────────────────────────────────
        // ADMIN — ADICIONAR CONVIDADO
        // POST api.php?acao=adicionar_convidado
        // Body: { nome, relacao }
        // ──────────────────────────────────────
        case 'adicionar_convidado':
            if ($metodo !== 'POST') erro('Método inválido.');
            $nome   = trim($body['nome'] ?? '');
            $relacao = trim($body['relacao'] ?? '');
            if (!$nome || !$relacao) erro('Dados inválidos.');

            $db = getDB();

            // Verificar duplicata
            $dup = $db->prepare('SELECT id FROM convidados WHERE LOWER(nome) = LOWER(?)');
            $dup->execute([$nome]);
            if ($dup->fetch()) erro('Convidado já cadastrado.');

            $db->prepare('INSERT INTO convidados (nome, relacao) VALUES (?, ?)')
               ->execute([$nome, $relacao]);

            responder(['ok' => true, 'id' => (int) $db->lastInsertId()]);

        // ──────────────────────────────────────
        // ADMIN — REMOVER CONVIDADO
        // DELETE api.php?acao=remover_convidado&id=5
        // ──────────────────────────────────────
        case 'remover_convidado':
            if ($metodo !== 'DELETE') erro('Método inválido.');
            $id = (int) ($_GET['id'] ?? 0);
            if (!$id) erro('ID inválido.');

            $db = getDB();
            $db->prepare('DELETE FROM convidados WHERE id = ? AND is_admin = 0')
               ->execute([$id]);

            responder(['ok' => true]);

        // ──────────────────────────────────────
        // ADMIN — ALTERAR CONFIGURAÇÃO
        // POST api.php?acao=configurar
        // Body: { chave: "revelacao"|"local_evento", valor: "..." }
        // ──────────────────────────────────────
        case 'configurar':
            if ($metodo !== 'POST') erro('Método inválido.');
            $chave = trim($body['chave'] ?? '');
            $valor = trim($body['valor'] ?? '');
            $permitidas = ['revelacao', 'local_evento', 'data_evento'];
            if (!in_array($chave, $permitidas)) erro('Chave inválida.');

            $db = getDB();
            $db->prepare('INSERT INTO configuracoes (chave, valor) VALUES (?, ?)
                          ON DUPLICATE KEY UPDATE valor = VALUES(valor)')
               ->execute([$chave, $valor]);

            responder(['ok' => true]);

        // ──────────────────────────────────────
        // ENVIAR FOTO
        // POST api.php?acao=enviar_foto (multipart/form-data)
        // Form fields: convidado_id, foto (file)
        // ──────────────────────────────────────
        case 'enviar_foto':
            if ($metodo !== 'POST') erro('Método inválido.');
            $id = (int) ($_POST['convidado_id'] ?? 0);
            if (!$id) erro('ID inválido.');
            if (empty($_FILES['foto'])) erro('Nenhuma foto enviada.');

            // Criar pasta de uploads se não existir
            if (!is_dir(UPLOAD_DIR)) mkdir(UPLOAD_DIR, 0755, true);

            $arquivo = $_FILES['foto'];
            $ext     = strtolower(pathinfo($arquivo['name'], PATHINFO_EXTENSION));
            $tipos   = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            if (!in_array($ext, $tipos)) erro('Formato de arquivo inválido.');
            if ($arquivo['size'] > 10 * 1024 * 1024) erro('Arquivo muito grande (máx 10MB).');

            $nome_arquivo = uniqid('foto_', true) . '.' . $ext;
            $destino      = UPLOAD_DIR . $nome_arquivo;

            if (!move_uploaded_file($arquivo['tmp_name'], $destino)) {
                erro('Erro ao salvar o arquivo.', 500);
            }

            $db = getDB();
            $db->prepare('INSERT INTO fotos (convidado_id, nome_arquivo, caminho) VALUES (?, ?, ?)')
               ->execute([$id, $nome_arquivo, UPLOAD_URL . $nome_arquivo]);

            responder(['ok' => true, 'caminho' => UPLOAD_URL . $nome_arquivo]);

        // ──────────────────────────────────────
        // ADMIN — LISTAR FOTOS
        // GET api.php?acao=fotos
        // ──────────────────────────────────────
        case 'fotos':
            $db = getDB();
            $fotos = $db->query('
                SELECT f.id, f.caminho, f.enviado_em,
                       c.nome AS enviado_por
                FROM fotos f
                JOIN convidados c ON c.id = f.convidado_id
                ORDER BY f.enviado_em DESC
            ')->fetchAll();

            responder($fotos);

        // ──────────────────────────────────────
        default:
            erro('Ação não encontrada.', 404);
    }

} catch (PDOException $e) {
    erro('Erro no banco de dados: ' . $e->getMessage(), 500);
} catch (Exception $e) {
    erro('Erro interno: ' . $e->getMessage(), 500);
}
