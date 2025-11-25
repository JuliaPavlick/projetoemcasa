import express, { response } from 'express'

const app = express()

    app.get('/usuarios', (request, response) =>{
        response.send('ok, deu bom')
    })

    app.listen(3000)