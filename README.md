# Desafio-Jitter

Criação de uma API em NodeJS para armazenar, pegar, atualizar e remover pedidos.
A Informação é armazenada em um banco de dados.

# configurações de github

git add .
git commit -m "descricao"
git push

# Configurações node.js

- npm init
- npm install express
- npm install express sqlite3 // (SQLlite para facilitar o teste)
- npm install jsonwebtoken  // JWT
- npm install swagger-ui-express // Swagger

# start server

node .\index.js

# Essa parte é para o desafio completo, com token JWT e Swagger

1. rode o servidor com node ./index.js
2. entre no swagger no seu navegador com http://localhost:3000/api-docs
3. Faça o login (usuário e senha já estão colocados)
4. pegue o token do login e clique em  "Authorize" e coloque o token sem as aspas " "
5. Agora pode testar todas as requisições de API que elas vão funcionar
6. Caso faça logout em "Authorize", tente fazer requisições. Elas devem falhar por falta de autenticação.

## Todos os comandos abaixo são para fazer testes sem o token JWT e o Swagger

Pode entrar na branch sem-token para testar

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

curl --location 'http://localhost:3000/order' \
--header 'Content-Type: application/json' \
--data '{
    "numeroPedido": "v10089015vdb-02",
    "valorTotal": 22222,
    "dataCriacao": "2023-02-20T12:24:11.5299601+00:00",
    "items": [
        {
            "idItem": "2222",
            "quantidadeItem": 2,
            "valorItem": 2200
        },
        {
            "idItem": "4444",
            "quantidadeItem": 1,
            "valorItem": 2330
        }
    ]
}'

# pegar a requisição:

curl http://localhost:3000/order/v10089015vdb-01 <-- precisa ser o mesmo valor do "numeroPedido">

curl http://localhost:3000/order/v10089015vdb-03 <-- deve retornar pedido nao encontrado>

# listar os pedidos

curl http://localhost:3000/order/list

Adicionei uma função extra para pegar os items e adicionar ao seu respectivo order da lista.
Também eliminei informações não úteis do banco de dados.

disso -> curl http://localhost:3000/order/list
[{"orderId":"v10089015vdb-01","value":10000,"creationDate":"2023-07-19T12:24:11.5299601+00:00"}]

para isso -> curl http://localhost:3000/order/list
[{"orderId":"v10089015vdb-01","value":10000,"creationDate":"2023-07-19T12:24:11.5299601+00:00","items":[{"productId":2434,"quantity":1,"price":1000}]}]

# Atualizar pedido
Necessário acrescentar o "-X PUT"

curl -X PUT --location 'http://localhost:3000/order/v10089015vdb-02' \
--header 'Content-Type: application/json' \
--data '{
    "numeroPedido": "v10089015vdb-02",
    "valorTotal": 2555,
    "dataCriacao": "2023-02-20T12:24:11.5299601+00:00",
    "items": [
        {
            "idItem": "5555",
            "quantidadeItem": 5,
            "valorItem": 2505
        },
        {
            "idItem": "6666",
            "quantidadeItem": 666,
            "valorItem": 6666
        },
        {
            "idItem": "7777",
            "quantidadeItem": 7,
            "valorItem": 7775
        }
    ]
}'

# Remover pedidos 

Remove o pedido e todos os seus items relacionados.

curl -X DELETE http://localhost:3000/order/v10089015vdb-01

curl -X DELETE http://localhost:3000/order/v10089015vdb-02