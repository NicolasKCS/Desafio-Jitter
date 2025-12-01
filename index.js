const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express'); // Importa o visualizador
const swaggerDocument = require('./swagger.json'); // Importa o arquivo JSON

const app = express();

// Usamos o próprio express para ler JSON. Isso é mais seguro e moderno.
app.use(express.json()); 

// Senha mestra
const SECRET_KEY = 'minha_senha_mestra';

// --- ROTA DA DOCUMENTAÇÃO (SWAGGER) ---
// Ao acessar http://localhost:3000/api-docs você verá a interface gráfica
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- MIDDLEWARE DE AUTENTICAÇÃO ---
function verificarToken(req, res, next){
    const authHeader = req.headers['authorization'];
    // se nao mandou token
    if (!authHeader) 
        return res.status(401).json({ auth: false, message: 'Acesso negado: Nenhum token fornecido.' });

    const token = authHeader.split(' ')[1];
    
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return res.status(403).json({ erro: 'Token inválido' });
        // Se passou, salva o ID e deixa entrar (next)
        req.userId = decoded.id;
        next();
    });
};

// 2. CONFIGURAÇÃO DO BANCO DE DADOS (SQLite)
// Isso cria um arquivo 'database.db' na sua pasta automaticamente.
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Erro ao conectar no banco de dados:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite.');
    }
});

// 3. CRIAÇÃO DAS TABELAS SQL
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS orders (
        orderId TEXT PRIMARY KEY,
        value REAL,
        creationDate TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orderId TEXT,
        productId INTEGER,
        quantity INTEGER,
        price REAL,
        FOREIGN KEY(orderId) REFERENCES orders(orderId)
    )`);
});

// --- ROTAS DA API ---

//login para gerar o token
app.post('/login', (req, res) => {
    const usuario = req.body.usuario;
    // Aqui você pode validar o usuário e senha (hardcoded para simplicidade)
    if (usuario === 'admin' && req.body.senha === 'password') {
        const token = jwt.sign({ id: usuario }, SECRET_KEY, { expiresIn: '1h' });
        res.json({ auth: true, token: token });
    } else {
        res.status(401).json({ auth: false, message: 'Usuário ou senha inválidos.' });
    }   
});

//  CRIAR PEDIDO (POST) verificarToken adicionado como middleware
app.post('/order', verificarToken, (req, res) => {
    const entrada = req.body;

    // Validação básica
    if (!entrada.numeroPedido) {
        return res.status(400).json({ erro: "Campo 'numeroPedido' é obrigatório." });
    }

    // TRANSFORMAÇÃO DE DADOS (Mapping: PT -> EN)
    const orderData = {
        orderId: entrada.numeroPedido,
        value: entrada.valorTotal,
        creationDate: entrada.dataCriacao
    };

    // Inserir no Banco de Dados
    const sqlOrder = `INSERT INTO orders (orderId, value, creationDate) VALUES (?, ?, ?)`;
    
    db.run(sqlOrder, [orderData.orderId, orderData.value, orderData.creationDate], function(err) {
        if (err) {
            return res.status(500).json({ erro: "Erro ao salvar pedido: " + err.message });
        }

        // Se o pedido salvou, salvar os itens
        const items = entrada.items || [];
        const sqlItem = `INSERT INTO items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)`;

        // Loop para salvar cada item
        items.forEach(item => {
            db.run(sqlItem, [orderData.orderId, item.idItem, item.quantidadeItem, item.valorItem]);
        });

        // Retorna o JSON transformado como o desafio pede
        res.status(201).json({
            message: "Pedido criado com sucesso!",
            order: {
                ...orderData,
                items: items.map(i => ({
                    productId: i.idItem,
                    quantity: i.quantidadeItem,
                    price: i.valorItem
                }))
            }
        });
    });
});

// listar todos os pedidos (GET) verificarToken adicionado como middleware
app.get('/order/list', verificarToken, (req, res) => {
    const sql = `SELECT * FROM orders`;
    db.all(sql, [], (err, orders) => {
        if (err) return res.status(500).json({ erro: err.message });
        if (orders.length === 0) return res.status(404).json({ message: "não há pedidos cadastrados" });

        // Passo 2: Buscar todos os itens de uma vez
        db.all(`SELECT * FROM items`, [], (err, items) => {
            if (err) return res.status(500).json({ erro: err.message });

            // Passo 3: A Manipulação (O "Match")
            // Para cada pedido, vamos filtrar os itens que pertencem a ele
            const pedidosCompletos = orders.map(pedido => {
                return {
                    orderId: pedido.orderId,
                    value: pedido.value,
                    creationDate: pedido.creationDate,
                    // pegamos só os itens desse ID
                    // utilizamos o map de novo para transformar os itens sem as informacoes do Banco de dados
                    items: items.filter(item => item.orderId === pedido.orderId).map(i => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        price: i.price
                    }))
                };
            });

            // Retorna a lista montada
            res.json(pedidosCompletos);
        });
    });
});


// LER PEDIDO (GET) verificarToken adicionado como middleware
app.get('/order/:id', verificarToken, (req, res) => {
    const id = req.params.id;
    
    const sql = `SELECT * FROM orders WHERE orderId = ?`;
    
    db.get(sql, [id], (err, row) => {
        if (err) return res.status(500).json({ erro: err.message });
        if (!row) return res.status(404).json({ message: "Pedido não encontrado" });

        // Se achou o pedido, busca os itens dele
        db.all(`SELECT productId, quantity, price FROM items WHERE orderId = ?`, [id], (errItems, rowsItems) => {
            if (errItems) return res.status(500).json({ erro: errItems.message });

            // Monta o objeto final
            res.json({
                orderId: row.orderId,
                value: row.value,
                creationDate: row.creationDate,
                items: rowsItems
            });
        });
    });
});

// ATUALIZAR PEDIDO (PUT) verificarToken adicionado como middleware
app.put('/order/:id', verificarToken, (req, res) => {

    const id = req.params.id;
    const entrada = req.body;
    const sql = `UPDATE orders SET value = ?, creationDate = ? WHERE orderId = ?`;

    db.run(sql, [entrada.valorTotal, entrada.dataCriacao, id], function(err) {

        if (err) return res.status(500).json({ erro: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "Pedido não encontrado" });

        const removeItemsSql = `DELETE FROM items WHERE orderId = ?`;

        db.run(removeItemsSql, [id], function(err) {
            if (err) return res.status(500).json({ erro: err.message });

            const insertItemSql = `INSERT INTO items (orderId, productId, quantity, price) VALUES (?, ?, ?, ?)`;
            const items = entrada.items || [];
            
            items.forEach(item => {
                db.run(insertItemSql, [id, item.idItem, item.quantidadeItem, item.valorItem]);
            });
            res.json({ message: "Pedido atualizado com sucesso!" });
        });
    });
});

// DELETAR PEDIDO (DELETE) verificarToken adicionado como middleware
app.delete('/order/:id', verificarToken, (req, res) => {
    const id = req.params.id;
    const sql = `DELETE FROM orders WHERE orderId = ?`;
    db.run(sql, [id], function(err) {
        if (err) return res.status(500).json({ erro: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "Pedido não encontrado" });
        // Também deletar os itens relacionados
        const deleteItemsSql = `DELETE FROM items WHERE orderId = ?`;
        db.run(deleteItemsSql, [id], function(errItems) {
            if (errItems) return res.status(500).json({ erro: errItems.message });
            res.json({ message: "Pedido e itens deletados com sucesso!" });
        });
    });
});



// INICIAR O SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log(`Swagger disponível em http://localhost:${PORT}/api-docs`);
});