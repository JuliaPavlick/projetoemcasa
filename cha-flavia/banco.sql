-- =============================================
-- CHÁ DE REVELAÇÃO DA FLÁVIA
-- Script de criação das tabelas MySQL
-- Execute este arquivo no phpMyAdmin
-- =============================================

USE u405215841_cha_flavia;

-- ─────────────────────────────────────────────
-- TABELA: convidados
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS convidados (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  relacao     VARCHAR(100) NOT NULL,
  is_admin    TINYINT(1)   DEFAULT 0,
  device_id   VARCHAR(100) DEFAULT NULL,
  criado_em   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABELA: filhos
-- Filhos vinculados a uma convidada
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS filhos (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  convidado_id   INT NOT NULL,
  nome           VARCHAR(100) NOT NULL,
  criado_em      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- TABELA: palpites
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS palpites (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  convidado_id   INT NOT NULL,
  voto           ENUM('menino','menina') NOT NULL,
  criado_em      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE CASCADE,
  UNIQUE KEY unico_voto (convidado_id)
);

-- ─────────────────────────────────────────────
-- TABELA: presencas
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS presencas (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  convidado_id   INT NOT NULL,
  confirmado     ENUM('sim','nao') NOT NULL,
  atualizado_em  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE CASCADE,
  UNIQUE KEY unica_presenca (convidado_id)
);

-- ─────────────────────────────────────────────
-- TABELA: configuracoes
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracoes (
  chave         VARCHAR(50) PRIMARY KEY,
  valor         TEXT        NOT NULL,
  atualizado_em TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────
-- TABELA: fotos
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fotos (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  convidado_id   INT NOT NULL,
  nome_arquivo   VARCHAR(255) NOT NULL,
  caminho        VARCHAR(500) NOT NULL,
  enviado_em     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (convidado_id) REFERENCES convidados(id) ON DELETE CASCADE
);

-- ─────────────────────────────────────────────
-- DADOS INICIAIS
-- ─────────────────────────────────────────────

INSERT INTO configuracoes (chave, valor) VALUES
  ('revelacao', 'locked'),
  ('local_evento', ''),
  ('data_evento', '2026-06-28')
ON DUPLICATE KEY UPDATE valor = VALUES(valor);

INSERT INTO convidados (nome, relacao, is_admin) VALUES
  ('Júlia',     'Titi Organizadora', 1),
  ('Flávia',    'Mamãe',             1),
  ('Victor',    'Papai',             1),
  ('Jaqueline', 'Vovó',              0),
  ('Sayonara',  'Vovó',              0),
  ('Ricardo',   'Vovô',              0)
ON DUPLICATE KEY UPDATE nome = VALUES(nome);

INSERT INTO presencas (convidado_id, confirmado)
SELECT id, 'sim' FROM convidados WHERE is_admin = 1
ON DUPLICATE KEY UPDATE confirmado = 'sim';
