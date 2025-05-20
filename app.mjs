import {tool, HttpApp, log} from './website-common.mjs'

const config = {
    app: {
    }
}

const httpd = new HttpApp({
    'port': 27000,
    'static_rout': './static',
    'template_path': './static/html/template',
    'html_path': './static/html',
    'use_auto_page': true
})

httpd.page('/', 'app.html')


httpd.run()