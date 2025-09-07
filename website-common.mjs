/* 
Fork Of Project <maimaitools> [#2501072139#] 
v: 250521
*/

import express from 'express'
import Path from 'path'
import {tool} from './tools-common.mjs'
import log from './console-common.mjs'

/**
 * @typedef {import('./types/wsc').ApiResBody} ApiResBody 响应到客户端的响应体
 * @typedef {import('./types/wsc').ApiReqBody} ApiReqBody 用户的请求内容
 */

/**
 * 构建一个HTTP服务
 */
export class HttpApp {
    /**
     * @typedef { function(ApiReqBody, ApiResBody, ApiEndCallback): void } ApiProcCallback api处理函数
     * @typedef { function(string | void, string | void) } ApiEndCallback 调用API结束时传入错误信息, 将自动返回请求端`JSON`数据
     */
    /**
     * 
     * @param {Object} param0 
     * @param {string} param0.host 监听(运行)在host
     * @param {string} param0.port 监听(运行)在端口
     * @param {string} param0.static_path 静态文件存放路径
     * @param {string} param0.static_rout 静态文件在站内的路由
     * @param {string} param0.template_path 模板文件存放路径
     * @param {string} param0.html_path 网页文件存放路径
     * @param {boolean} param0.print_req 打印访问日志
     * @param {boolean} param0.use_cache_file 使用缓存文件以提高性能
     * @param {boolean} param0.use_auto_page 自动映射HTML文件到路由路径
     */
    constructor({
        host = '0.0.0.0',
        port = 27000,
        static_path = './src/static',
        static_rout = '/',
        html_path = './src/html',
        template_path = './src/html/template',
        print_req = true,
        use_cache_file = true,
        use_auto_page = true,
    }) {
        const app = express()

        // 确保路径有效性
        if (!(tool.isDir(static_path) || tool.isDir(html_path) || tool.isDir(template_path))) {
            throw log.error('invalid_path: constructor HttpAPP failed.')
        }


        /**Express实例对象 */
        this.expressApp = app

        /**HTTP服务目标监听端口 */
        this.port = port
        /**HTTP服务目标监听Host */
        this.host = host

        /**HTML目录在文件系统位置 */
        this.path_html = html_path
        /**模板目录在文件系统位置 */
        this.path_template = template_path
        /**静态目录在文件系统位置 */
        this.path_static = static_path


        
        /**API方法注册事件 @type {{[x: string]: ApiProcCallback}} */
        this.api_method = {}

        // 打印请求内容中间件
        if (print_req) {
            app.use((req, _, next) => {
                log.req(req)
                const cookie = this._getCookie(req.headers.cookie)
                if (cookie.get('developers', false)) log.det('is developers')
                
                next()
            })
        }



        /* 设置静态文件路由 */ app.use(static_rout, express.static(static_path))// 中间件部分

        /* 配置json解析中间件 */ app.use(express.json())





        // 读取并缓存HTML文件以实现更好的效率
        /**使用缓存的HTML内容, 否则将随用随取 */
        this.use_cache_html = use_cache_file
        /**
         * HTML文件会缓存为这个对象
         * @typedef {{[x: string]: string | void}} cacheObj
         * @type {cacheObj}
         */
        this.cont_html = {}
        /**
         * HTML文件列表
         * @type {string[]}
         */
        this.list_html = []
        /**
         * 模板文件会缓存为这个对象
         * @type {cacheObj}
         */
        this.cont_template = {}

        /**
         * 模板列表
         * @type {string[]}
         */
        this.list_template = []

        if (use_cache_file) { 
            /**
             * 将文件缓存到对象
             * @param {string} path 
             * @param {object} target 
             * @param {Array} list 
             */
            const cache = (path, target, list = []) => {
                const file_list = tool.readDirFile(path)
                if (file_list instanceof Error) {
                    throw log.error(`invalid_path: ${html_path}`)
                }
                file_list.forEach((path_name) => {
                    // 匹配文件扩展名是否是HTML文件
                    // log.debug(path_name)
                    if (['.html', '.htm'].includes(Path.extname(path_name))) {
                        // 是合法的文件名
                        const filename = Path.basename(path_name)
                        target[filename] = tool.readFileToStr(path_name)
                        list.push(filename) // 添加到文件列表
                    }
                })
            }
            cache(html_path, this.cont_html, this.list_html)
            cache(template_path, this.cont_template, this.list_template)

        } else { // 但有时使用者也无需缓存
            // ~(fork of no cache)
        }

        

        // 初始化...

        // ~(TAG)API路由实现  初始化API路由
        app.post('/api', (req, res) => {
            /**
             * 结束这个响应并发送数据, 当传入错误信息时响应为无效响应
             * @param {string} message 错误信息(简述)
             * @param {string} [det_message] 详细的错误信息
             */
            const endReq = (message = '', det_message) => {
                res_body.valid = message ? false : true
                if (message) {
                    res_body.message = message
                    res_body.det_message = det_message
                }
                res.send(res_body).end()
            }

            /**请求体 @type {ApiReqBody} */
            const req_body = req.body
            if (!req_body) {
                endReq('bad_request')
            }
            /**响应体 @type {ApiResBody} */
            let res_body = {} // 初始化响应体
            const use_target = req_body['target']

            const execute = /* 在这里执行 */this.api_method[use_target]
            if (!execute) {
                // 处理函数不存在
                return endReq('target_not_found')
            }

            // 正常的执行处理函数
            execute(req_body, res_body, endReq)
        })

        // 自动映射页面路由
        if (use_auto_page) {
            // ~(add)
            
            
        }



        // 打印当前Web服务器功能状态
        /**
         * 输出yes或no
         * @param {boolean} is_yes 
         */
        const sYN = (is_yes) => { return is_yes ? 'Yes' : 'No' }
        // 输出队列
        [
            'Hello QUPR HTTP Server!',
            `Cache Mode: ${sYN(use_cache_file)}`,
            `Auto Page: ${sYN(use_auto_page)}`,
        ].forEach((message) => {
            log.info(message)
        })
    

    }

    /**
     * 获取一个请求的cookie内容
     * @param {string} cookies 
     */
    _getCookie(cookies) {
        /**字符内容映射表, 若cookie的value与键相同将会被转换为该值 */
        const mapping = {
            'true': true,
            'false': false
        }

        let content = {
            /**
             * 获取cookie的某个值
             * @param {string} key 需要获取的字段名(键)
             * @param {any} normal 若该值不存在指定一个默认值
             */
            get: (key, normal = undefined) => {
            const cont = content[key]
            return cont === undefined ? normal : cont
        }}
        if (!cookies) return content
        const mapping_key = Object.keys(mapping)
        const cookie_list = cookies.split('; ')
        cookie_list.forEach((cookie) => {
            const item = cookie.split('=')
            let value = item[1]
            let key = item[0]
            const _case = value.toLowerCase()
            if (mapping_key.includes(_case)) {
                // 映射为指定内容
                value = mapping[_case]
            }
            content[key] = value
        })
        return content
    }



    //
    // 创建路由
    //

    /**
     * 新建(注册)一个路由处理器
     * @param {string} path 
     * @param {function(Request, Response)} callback 
     */
    get(path, callback) {
        this.expressApp.get(path, (req, res) => {
            callback(req, res)
        })
    }

    /**
     * 新建(注册)一个路由以返回前端页面
     * @param {string} path 
     * @param {string} html_name 
     */ 
    page(path, html_name) {
        const {expressApp} = this
        expressApp.get(path, (_, res) => {
            let content = ''
                
            content = this.readHtml({filename: html_name})
            if (!content) {
                log.error('file', html_name, 'not found.')
                return res.status(500).send('Server Error! File Not Found.').end()
            }
            
            res.send(content).end()
        })
    }

    /**
     * 新建(注册)一个API处理项
     * 
     * 在APP上使用 `POST /api <DATA>(Object)`来调用
     * @param {string} target 表示当使用POST请求时请求体target值为何时触发指定函数
     * @param {ApiProcCallback} callback 处理体
     */
    api(target, callback) {
        /* 在这里添加 */this.api_method[target] = (...arg) => {
            log.det(`target: ${target}`)
            callback(...arg)
        }
    }

    //
    // H5FILE
    //


    /**
     * 读取一个HTML文件的内容(在`this.path_html`中), 并按照规则替换`<REPLACE>`的内容
     * @param {Object} param0
     * @param {string} param0.filename HTML文件名
     * @param {boolean} [param0.is_template=false] 为模板文件, 将映射为模板目录下的文件并不进行渲染
     * @param {Request} [param0.request] 当前会话的Request对象
     * @param {Object} param0.self_keyword 自定义模板字符串内关键字
     */
    readHtml({filename, is_template = false, request = {}, self_keyword = {}}) {
        const {path_html, path_template} = this
        // log.debug('readHtml in arg of', filename) // ~(fix)in arg is ok
        

        /**
         * 生成一个可用于表示DOM的注释内容元素以用于标记
         * @param {string} cont 注释内容
         */
        const makeNote = (...cont) => {
            return `<!-- [render] ${cont.join('')} -->`
        }

        // 模板字符串内关键字(权重:0)
        const keyword = {
            path: request.url
        }


        /**预渲染HTML文件 @param {string} cont */
        const render = (cont) => {
            // -- func --

            /**
             * 替换标签为指定内容
             * @param {string} org_text 原始内容
             * @param {(tag_cont: string) => string} handler 处理标签内容函数
             */
            const replaceTag = (org_text, handler) => {
                let result = org_text
                return result.replace(/\{\{\s*([^{}]*?)\s*\}\}/g, (_, args) => {
                    return handler(args)
                })
            }

            // -- exec --
            /**模板列表 */
            const list = tool.readDir(path_template, 'name_no_ext')
            if (list instanceof Error) return ''
            cont = cont.replace(/* 特别注意: 此正则表达式由AI生成 */ /(?<!\\)<#(.*?)(?<!\\)>/g, (_, tag_cont) => {
                // <#template_name:          { key: value }>
                //    ^模板名      ^固定为冒号     ^JSON字符串
                //             表示模板名与数据区分
                // 例: <#profile: {username: 'name', email: 'xxx@xx.xx'}>

                // 在模板文件中
                // <element> {{ key = value }} </element>
                //              ^ 待替换的值会
                //         在渲染的时候根据参数传递

                /* ref */const split = tool.splitStr
                // 预处理标签内容
                const args = split(tag_cont, ':', 2) // 获取参数
                const template_name = args[0].trim()

                /**传递的模板参数 (权重:1) @type {Object.<string, any>} */let template_params = {}
                try { // 尝试解析JSON内容
                    template_params = JSON.parse(args[1])
                } catch (e) { }

                // 将渲染的keyword
                const params = {
                    ...self_keyword,
                    ...template_params,
                    ...keyword
                }
                
                // 模板读取
                if (!list.includes(template_name)) return '' // 如果没有该模板
                const target = template_name + '.html'
                let result = this.readHtml({filename: target, is_template: true})

                // 模板参数传递
                // result = result.replace(/\{\{\s*([^{}]*?)\s*\}\}/g, (_, args) => {
                //     const param = split(args, '=', 2)
                //     const key = param[0].trim()
                //     const normal = param[1]
                //     const cont = template_params[key]

                //     return `${
                //         cont === void 0 ?
                //             typeof(normal) === 'string' ? normal.trim() : ''
                //         : cont
                //     }`
                // })

                // (!) 特别注意, 迁移实现的这个方法因常识性错误debug了几天(虚)才发现问题, 请更改新的实现方式的时候多加注意
                result = replaceTag(result, (args) => {
                    const param = split(args, '=', 2)
                    const key = param[0].trim()
                    const normal = param[1]
                    const cont = params[key]

                    return `${
                        cont === void 0 ?
                            typeof(normal) === 'string' ? normal.trim() : ''
                        : cont
                    }`
                })
                
                

                // 输出
                return [
                    makeNote(template_name, ':start'),
                    result,
                    makeNote(template_name, ':end')
                ].join('')
            })
            // log.debug('result cont of:', cont)
            return cont
        }


        let content = '' // 初始化内容

        if (this.use_cache_html) {
            // 有缓存的情况
            const target = is_template ? this.cont_template : this.cont_html
            content = target[filename]
            
            if (!content) return ''
        } else {
            // 无缓存的情况
            const file_name = Path.join(is_template ? path_template : path_html, filename) 
            // log.debug(file_name)
            content = tool.readFileToStr(file_name)
            if (typeof(content) !== 'string') return ''
        }

        if (!is_template) {// 预渲染非模板文件的HTML文件
            // ~(fix)
            return render(content)
        }


        return content
    }


    /**运行这个HTTP服务 */
    run() {
        const {host, port, expressApp} = this
        // 未匹配到路由 
        expressApp.use((req, res) => {
            // ~(TAG)404 page
            res.status(404)
            if (req.method === 'GET') {
                log.det('not fond')
                res.send(this.readHtml({filename: '404.html', request: req}))
            }
        })


        const server = expressApp.listen(this.port, this.host, () => {
            log.info(`Server is running on http://${host + ':' + port}`)
        })
        this.server = server

    }
}






// test command
// ...

// log.warn(Path.join(process.cwd(), '../src/html'))

// log.debug(tool.xor(0, 1))
log.req('test')