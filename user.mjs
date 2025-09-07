import {JSONData} from './file-common.mjs'
import Path from 'path'
import tool from './tools-common.mjs'

class UserConfig {
    constructor(user_config_path = './users/') {
        const path = (...path_part) => Path.join(user_config_path, ...path_part)
        /**
         * @type {{ last_uid: number, users: {[uid: string]: { name: string, token: string, avatar: string | null, time: {create: number, modify: number} }} }}
         */
        const users = new JSONData(path('main.json'))
        this.data = {
            main: users,
            avatar: path('avatar')
        }
        this.users = users
        
        if (Object.keys(users.data) <= 0) {
            // init userdata
            users.data = {
                
            }
        }
    }

    /**
     * 
     * @param {object} param0 
     * @param {string} param0.username 用户名
     * @param {string} param0.password 用户密码
     * @param {number} param0.uid 用户密码
     * @returns 
     */
    getToken({username, password, uid}) {

        // ~(last)
        return tool.strToMd5HashValue(username, password, uid)
    }

    /**
     * 创建一个用户实例持久化存储
     * @param {object} param0 
     * @param {string} param0.username 用户名
     * @param {string} param0.password 用户密码
     */
    createNewUser({username, password}) {
    }
}

// test command
// const json = new JSONData('./test.json', {
//     'mute_log': false
// })
// console.log(json.data)
// console.log(json.data)
// console.log(json.data)