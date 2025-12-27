import {HttpApp} from './website-common.mjs'
import {tool} from './tools-common.mjs'
import {UserConfig} from './user-common.mjs'
import {log} from './console-common.mjs'

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
    'use_auto_page': true,
    'use_cache_file': false,
    // 'delay_start_s': 5,
    'render_mapping_context': {
        version: 'dev-251226'
    }
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
        // init value
        /**随机种子.@type {string} */
        this.session_random_seed = `${tool.time}`

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

        httpd.api('online', (req, res) => {

        })

        this.state.init = true
    }

    out(...cont) {
        log.print('<Server>', ...cont)
        
    }
    /**
     * 创建一个全局唯一的会话ID
     * @param {number} [uid=0] 用户ID, 默认为0
     * @return {string} 返回会话ID
     **/
    createSession(uid = 0) {
        this.session_random_seed = tool.strToMd5HashValue(uid, tool.time)
        return this.session_random_seed
    }

    run() {
        const {state, config} = this
        state.interval_index = setInterval(() => {
            try {
                // Server Main Loop / once cycle
                // 
                // ~(TAG)服务器心跳包主循环

            } catch (error) {
                state.running = false
                state.interval_index = null
                log.error('服务器主循环发生错误:', error)
                return
            }
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

httpd.page('/dev', 'dev.html')

httpd.page('/status/404', '404.html')

httpd.run()

// ------ test code ------
// const user_config = new UserConfig()
