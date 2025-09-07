import {tool, HttpApp, log} from './website-common.mjs'


// ------ server area ------
const config = {
    app: {
    }
}

const httpd = new HttpApp({
    'port': 27000,
    'static_rout': '/',
    'template_path': './src/html/template',
    'html_path': './src/html',
    'use_auto_page': true
})

class Server {
    /**
     * 构建一个网络聊天室实例
     * @param {HttpApp} httpd HttpApp的实例
     * @param {Object} param1 
     * @param {number} param1.connect_timeout 连接超时时间(秒)
     * @param {number} param1.max_online_user 最大在线人数, 若指定为0则不限制人数
     * @param {string} param1.user_profile_file 用户实例文件, 用于持久化保存用户数据
     * @param {number} param1.server_loop_cycle 服务器循环周期(毫秒)
     */
    constructor(httpd, {connect_timeout = 30, max_online_user = 0, user_profile_file = './users.json', server_loop_cycle = 100}) {
        this.online_users = {}
        this.config = {
            connect_timeout,
            max_online_user,
            user_profile_file,
            server_loop_cycle
        }
        /**当前状态 */
        this.state = {
            /**@type {null | number | NodeJS.Timeout} */
            interval_index: null,
            /**是否在运行 */
            running: false,
            /**是否已初始化 */
            init: false,

            // ~(last)
            user: {
                online: {},
                length: 0,

            }
        }

        this.httpd = httpd

        httpd.api('heart', (req, res) => {

        })

        this.state.init = true
    }

    createSession(uid = 0) {
        return tool.strToMd5HashValue(uid, tool.time)
    }

    run() {
        const {state, config} = this
        state.interval_index = setInterval(() => {
            // once cycle
            
        }, config.server_loop_cycle)

        state.running = true
    }

    stop() {
        clearInterval(this.state.interval_index)
        this.state.running = false
    }
}
 

// ------ view area ------

httpd.page('/', 'app.html')


httpd.run()