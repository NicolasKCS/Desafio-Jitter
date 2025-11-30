const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();

// Usamos o próprio express para ler JSON. Isso é mais seguro e moderno.
app.use(express.json()); 

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

// ROTA 1: CRIAR PEDIDO (POST)
app.post('/order', (req, res) => {
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

// ROTA 2: LER PEDIDO (GET)
app.get('/order/:id', (req, res) => {
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

// INICIAR O SERVIDOR
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});