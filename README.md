# Desafio-Jitter

# configurações de github

git add .
git commit -m "descricao"
git push

# Configurações node.js

npm init
npm install express

# start server

node .\index.js

# enviar requisições
entrar no git bash 

enviar uma requisição de criação:

curl --location 'http://localhost:3000/order' \
--header 'Content-Type: application/json' \
--data '{
    "numeroPedido": "v10089015vdb-01",
    "valorTotal": 10000,
    "dataCriacao": "2023-07-19T12:24:11.5299601+00:00",
    "items": [
        {
            "idItem": "2434",
            "quantidadeItem": 1,
            "valorItem": 1000
        }
    ]
}'

# pegar a requisição:
curl http://localhost:3000/order/v10089015vdb-01 <-- precisa ser o mesmo valor do "numeroPedido">
curl http://localhost:3000/order/v10089015vdb-02 <-- deve retornar pedido nao encontrado>

#