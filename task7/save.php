<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once __DIR__ . '/config.php';

function getDBConnection() {
    static $pdo = null;
    if ($pdo === null) {
        $config = require __DIR__ . '/config.php';
        $dsn = "mysql:host={$config['host']};dbname={$config['dbname']};charset={$config['charset']}";
        try {
            $pdo = new PDO($dsn, $config['username'], $config['password'], [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]);
        } catch (PDOException $e) {
            error_log($e->getMessage());
            die('Ошибка соединения с базой данных. Обратитесь к администратору.');
        }
    }
    return $pdo;
}

function generateUniqueLogin(PDO $pdo): string {
    do {
        $login = 'user_' . substr(md5(uniqid()), 0, 8);
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM application_accounts WHERE login = ?");
        $stmt->execute([$login]);
        $exists = $stmt->fetchColumn() > 0;
    } while ($exists);
    return $login;
}

function generatePassword(): string {
    $chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return substr(str_shuffle($chars), 0, 10);
}

// Загрузка аватара с защитой
function uploadAvatar($file, $existingPath = null) {
    if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
        return $existingPath;
    }
    $allowedMime = ['image/jpeg', 'image/png', 'image/gif'];
    $allowedExt = ['jpg', 'jpeg', 'png', 'gif'];
    $maxSize = 2 * 1024 * 1024; // 2 MB

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, $allowedMime)) return $existingPath;
    if ($file['size'] > $maxSize) return $existingPath;

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt)) return $existingPath;

    $newName = bin2hex(random_bytes(16)) . '.' . $ext;
    $uploadDir = __DIR__ . '/uploads/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    if (move_uploaded_file($file['tmp_name'], $uploadDir . $newName)) {
        // Удаляем старый аватар
        if ($existingPath && file_exists($uploadDir . basename($existingPath))) {
            unlink($uploadDir . basename($existingPath));
        }
        return '/uploads/' . $newName;
    }
    return $existingPath;
}

function saveNewApplication(array $data, PDO $pdo, $avatarFile = null): int {
    $pdo->beginTransaction();
    try {
        $avatarPath = null;
        if ($avatarFile) {
            $avatarPath = uploadAvatar($avatarFile);
        }

        $stmt = $pdo->prepare("
            INSERT INTO applications 
            (full_name, phone, email, birth_date, gender, bio, contract_agreed, avatar)
            VALUES (:full_name, :phone, :email, :birth_date, :gender, :bio, :contract_agreed, :avatar)
        ");
        $stmt->execute([
            ':full_name'       => $data['full_name'],
            ':phone'           => $data['phone'],
            ':email'           => $data['email'],
            ':birth_date'      => $data['birth_date'],
            ':gender'          => $data['gender'],
            ':bio'             => $data['bio'],
            ':contract_agreed' => 1,
            ':avatar'          => $avatarPath
        ]);
        $appId = (int)$pdo->lastInsertId();

        if (!empty($data['languages'])) {
            $langStmt = $pdo->prepare("SELECT id FROM programming_languages WHERE name = ?");
            $linkStmt = $pdo->prepare("INSERT INTO application_languages (application_id, language_id) VALUES (?, ?)");
            foreach ($data['languages'] as $lang) {
                $langStmt->execute([$lang]);
                $langId = $langStmt->fetchColumn();
                if ($langId) {
                    $linkStmt->execute([$appId, $langId]);
                }
            }
        }

        $pdo->commit();
        return $appId;
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log($e->getMessage());
        throw new Exception('Ошибка сохранения заявки');
    }
}

function updateApplication(int $appId, array $data, PDO $pdo, $avatarFile = null): void {
    $pdo->beginTransaction();
    try {
        // Получаем текущий аватар
        $stmt = $pdo->prepare("SELECT avatar FROM applications WHERE id = ?");
        $stmt->execute([$appId]);
        $currentAvatar = $stmt->fetchColumn();

        $avatarPath = uploadAvatar($avatarFile, $currentAvatar);

        $stmt = $pdo->prepare("
            UPDATE applications
            SET full_name = :full_name,
                phone = :phone,
                email = :email,
                birth_date = :birth_date,
                gender = :gender,
                bio = :bio,
                contract_agreed = :contract_agreed,
                avatar = :avatar
            WHERE id = :id
        ");
        $stmt->execute([
            ':id'              => $appId,
            ':full_name'       => $data['full_name'],
            ':phone'           => $data['phone'],
            ':email'           => $data['email'],
            ':birth_date'      => $data['birth_date'],
            ':gender'          => $data['gender'],
            ':bio'             => $data['bio'],
            ':contract_agreed' => 1,
            ':avatar'          => $avatarPath
        ]);

        $delStmt = $pdo->prepare("DELETE FROM application_languages WHERE application_id = ?");
        $delStmt->execute([$appId]);

        if (!empty($data['languages'])) {
            $langStmt = $pdo->prepare("SELECT id FROM programming_languages WHERE name = ?");
            $linkStmt = $pdo->prepare("INSERT INTO application_languages (application_id, language_id) VALUES (?, ?)");
            foreach ($data['languages'] as $lang) {
                $langStmt->execute([$lang]);
                $langId = $langStmt->fetchColumn();
                if ($langId) {
                    $linkStmt->execute([$appId, $langId]);
                }
            }
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log($e->getMessage());
        throw new Exception('Ошибка обновления заявки');
    }
}

function createAccount(int $appId, string $login, string $password, PDO $pdo): void {
    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO application_accounts (application_id, login, password_hash) VALUES (?, ?, ?)");
    $stmt->execute([$appId, $login, $hash]);
}

function getApplicationById(int $appId, PDO $pdo): ?array {
    $stmt = $pdo->prepare("SELECT * FROM applications WHERE id = ?");
    $stmt->execute([$appId]);
    $app = $stmt->fetch();
    if (!$app) return null;

    $langStmt = $pdo->prepare("
        SELECT pl.name FROM application_languages al
        JOIN programming_languages pl ON al.language_id = pl.id
        WHERE al.application_id = ?
    ");
    $langStmt->execute([$appId]);
    $languages = $langStmt->fetchAll(PDO::FETCH_COLUMN);

    $app['languages'] = $languages ?? [];
    return $app;
}

function authenticate(string $login, string $password, PDO $pdo): ?int {
    $stmt = $pdo->prepare("SELECT application_id, password_hash FROM application_accounts WHERE login = ?");
    $stmt->execute([$login]);
    $acc = $stmt->fetch();
    if ($acc && password_verify($password, $acc['password_hash'])) {
        return (int)$acc['application_id'];
    }
    return null;
}