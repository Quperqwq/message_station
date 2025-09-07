import { JSONData } from './file-common.mjs'
import Path from 'path'
import {tool} from './tools-common.mjs'
import log from './console-common.mjs'

/**模块的配置信息 */
const module_config = {
    main_path: './users',
    max_online: 10,
    user_login_valid_time: 2592000, // session登入最大有效时间(单位秒)
}

export class UserConfig {
    #data
    /**
     * 配置用户持久化存储
     */
    /**
     * @typedef {'username' | 'password' | 'email' | 'avatar'} UserProfileItemName 用户配置字段名
     * @typedef {{[uid: string]: { name: string, avatar: string | null, auth: {token: string, salt: string}, time: {create: number, modify: number}}}} UserProfileList 用户信息列表
     * @typedef {UserProfileList[string]} UserProfile 用户信息
     * @typedef {{ last_uid: number, users: UserProfileList }} UsersData 用户配置数据体
     * 
     * @typedef {{session: string, time: number}} LoginUsersConfigItem 已登入用户实例持久存储格式
     * @typedef {{[uid: number]: LoginUsersConfigItem}} LoginUsersConfig 已登入用户实例持久存储格式
     */

    config = {
        /**@type {{[key in UserProfileItemName]: {length: [min_length: number, max_length: number]}}} */
        user_valid: {
            username: {
                length: [4, 12]
            },
            password: {
                length: [8, 16]
            }
        },
        login_valid_time: module_config.user_login_valid_time
    }
    /** @type {UsersData} */
    #default_config = {
        last_uid: 1000,
        users: {},
    }
    /** @type {UserProfile} */
    #default_profile = {
        name: '',
        avatar: null,
        time: {
            create: 0,
            modify: 0
        },
        auth: {
            token: '',
            salt: ''
        }
    }



    constructor(user_config_path = module_config.main_path) {
        const path = (...path_part) => Path.join(user_config_path, ...path_part)

        // create data body - user data
        const json_data = new JSONData(path('main.json'), {
            'on_reset': () => log.warn('user config is not found, well be init.'),
            'default_data': this.#default_config
        })

        // create data body - login user config
        const login_json_data = new JSONData(path('login_users.json'))

        this.#data = {
            main: json_data,
            login: login_json_data,
            avatar: path('avatar'),
        }


        // - 请勿在此之前使用this.#users -

        // if (!this.#config_data) {
        //     // init userdata
        //     log.warn('user config is invalid, well be init.')
        //     this.#config_data = this.#default_config
        // }
    }

    /**
     * 获取一个用户的凭证
     * @param {object} param0 
     * @param {string} param0.username 用户名
     * @param {string} param0.password 用户密码
     * @param {number} param0.uid 用户密码
     * @param {string} param0.salt 
     * @returns 
     */
    getToken({ username, password, uid, salt }) {
        return tool.strToHashValue([username, password, uid, salt].join('//'), 'sha256')
    }

    getSalt() {
        return tool.getRandom('md5')
    }

    // ------ New User Methods ------

    /**
     * 创建一个用户实例持久化存储
     * @param {object} param0 
     * @param {string} param0.username 用户名
     * @param {string} param0.password 用户密码
     * 
     */
    createNewUser({ username, password }) {
        // init
        const result = this.makeResult

        // step.1 检查传入用户信息有效性
        const check_result = this.isValidUserProfiles({ username, password })
        if (!check_result.valid) return result(check_result.result[0])

        // step.2 生成用户实例数据结构
        const uid = this.#getNextUid()
        const salt = this.getSalt()
        const token = this.getToken({
            username, password, uid, salt
        })
        /**@type {UserProfile} */
        const profile = {
            ...this.#default_profile,
            name: username,
            auth: {
                salt,
                token
            },
            time: {
                create: this.timestamp
            }
        }

        // step.3 更新到持久化存储内
        this.#updateUserConfig(uid, profile)

        return result(profile)
    }

    // ------ User Instance Method ------

    /**
     * 是否为有效的用户信息
     * @param {UserProfileItemName} check_type 检查项目
     * @param {string} check_value 检查值
     */
    isValidUserProfile(check_type, check_value) {
        /**来自系统配置定义的有效范围 */
        // -- after --
        const valid_config = this.config.user_valid

        /**@type {{[key in UserProfileItemName]: RegExp | undefined}} */
        const checker_reg = {
            username: /^[\p{L}]+$/u,
            password: /^(?!.*\s)[\S]+$/,
            email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        }

        /**@type {{[key in UserProfileItemName]: () => Boolean} | undefined} */
        const checker_repeat = {
            username: () => {
                let is_repeat = false
                this.#forEachUser((user_data) => {
                    // log.debug('name of', user_data.name, '; check of', check_value, ';', user_data.name === check_value)
                    if (user_data.name === check_value) {
                        is_repeat = true
                        return true // 返回的这个值是为了停止遍历
                    }
                })
                return is_repeat
            }
        }



        // -- start --

        // check length
        const { length: allow_size = null } = valid_config[check_type]
        if (allow_size) { // 适用长度
            const length_of = check_value.length
            if (allow_size[0] > length_of) return 'too_short'
            if (allow_size[1] < length_of) return 'too_long'
        }

        // test regex
        const checker = checker_reg[check_type]
        if (checker) { // 适用正则
            if (!checker.test(check_value)) return 'invalid'
        }

        // check repeat
        const checkRepeat = checker_repeat[check_type]
        if (checkRepeat) { // 适用检查重复
            if (checkRepeat()) return 'is_repeat'
        }


        return ''
    }

    /**
     * 是否为有效的多个用户信息
     * @param {{[key in UserProfileItemName]: [check_value: string]}} check_param 
     */
    isValidUserProfiles(check_param) {
        let valid = true
        /**@type {string[]} */
        const result = []
        Object.keys(check_param).forEach((check_type) => {
            const check_value = check_param[check_type]
            const info = this.isValidUserProfile(check_type, check_value)
            if (info) {
                valid = false
                result.push(`${check_type}_${info}`)
            }
        })
        return {
            valid,
            result
        }
    }

    /**
     * 该UID是否存在
     * @param {number} uid 
     */
    isExistUID(uid) {
        return !(this.#getProfile(uid) === null)
    }

    // /**
    //  * 转换为有效的用户配置内容
    //  * @param {UserProfile} user_data 
    //  * @param {UserProfile} new_data 
    //  */
    // toValidUserProfile(user_data, new_data) {
    //     const result = this.#default_profile
    //     result = {
    //         ...user_data
    //     }
    // }

    /**
     * 
     * @param {object} param0 
     * @param {string} param0.username 用户名
     * @param {string} param0.password 用户密码
     * @param {string} param0.uid 当传入uid时可不传入用户名
     * @param {string} param0.session_of 尝试使用session登入
     */
    login({ username, uid, password, session_of }, make_session = true) {
        const result = this.makeResult

        if (!session_of) {
            // fork.normal - use password

            // 尝试获取用户信息
            const uid_of = uid ? uid : this.#searchUIDByName(username)
            if (!uid_of) return result('uid_not_found')
            const user_data = this.#getProfile(uid_of)
            if (!user_data) return result('user_not_found')
            const user_auth = user_data.auth

            // 尝试校验
            const now_token = this.getToken({ username: user_data.name, password, uid: uid_of, salt: user_auth.salt })
            if (now_token !== user_auth.token) return result('login_fail')

            if (make_session) {
                // 尝试创建会话
                const confirm = this.#addLoginSession(uid_of, now_token)
                if (!confirm.valid) return result(confirm.message)
                // user_data.session = this.joinSession(uid_of, confirm.value.session)
            }


            return result(this.outProfile(uid_of, {org_full_data: user_data}))
        } else {
            // fork.session - match session
            const confirm = this.#getLoginValidBySession(session_of)
            if (!confirm.valid) return result(confirm) // 是否有效
            const { uid } = this.splitSession(session_of)

            // 成功登入后刷新用户Session
            const returns = result(this.outProfile(uid))
            returns.value.session = this.joinSession(uid, this.#refreshLoginSession(session_of).value.session) // 更新Session

            return returns // 返回用户信息
        }

    }

    /**
     * 修改一个用户的信息
     * @param {number} uid 用户ID
     * @param {UserProfile} new_profile 更新的内容
     */
    changeUserProfile(uid, new_profile) {
        if (this.isExistUID(uid)) return 'user_not_found'
        this.#updateUserConfig(uid, new_profile)
        return ''
    }


    // ------ Private Methods ------

    /**
     * 用户持久化配置文件
     * ```
     * const org_config = this.#config_data
     * // change something...
     * this.#config_data = org_config
     * ```
     * @returns {UsersData}
     */
    get #config_data() {
        return this.#data.main.data
    }

    /**
     * @param {UsersData} data
     */
    set #config_data(data) {
        this.#data.main.data = data
    }

    /**
     * 用户持久化用户登入配置文件
     * @returns {LoginUsersConfig} 
     */
    get #login_data() {
        return this.#data.login.data
    }

    /**
     * @param {LoginUsersConfig} data 
     */
    set #login_data(data) {
        this.#data.login.data = data
    }

    /**
     * 获取下一个用户ID并更新到持久化存储
     */
    #getNextUid(_cache_data = this.#config_data) {
        const org_config = _cache_data
        let uid = org_config.last_uid + 1
        const validNewUID = () => {
            if (org_config.users[uid]) { // UID重合情况 重新获取可用UID
                uid += 1
                validNewUID()
            }
        }
        validNewUID()

        this.#config_data = org_config
        return uid
    }




    // -- Session Methods --

    #getLoginSession(uid, _cache_data = this.#login_data) {
        const result = this.makeResult
        const org_data = _cache_data
        const target_session = org_data[uid]
        if (!target_session) return result('session_not_found')
        return result(target_session)
    }

    /**
     * 获取一个登入会话
     * @param {number} uid 用户ID
     * @param {string} token 用户登入凭证
     */
    #makeLoginSession(uid, token, use_uid_head = true) {
        const session = tool.strToHashValue(`${uid}-${token}-${this.timestamp_ms}-${tool.getRandom('md5')}`, 'sha256', 'hex')
        return use_uid_head ? this.joinSession(uid, session) : session
    }

    /**
     * 更新用户实例的Session
     * @param {number} uid 
     * @param {string} token 
     */
    #updateLoginSession(uid, token, _cache_data = this.#login_data) {
        const result = this.makeResult
        if (!(uid && token)) return result('missing_param')

        const org_data = _cache_data
        const session = this.#makeLoginSession(uid, token, false)

        org_data[uid] = {
            session,
            time: this.timestamp
        }
        this.#login_data = org_data
        log.debug('change(add) login session:', org_data[uid])

        return result(org_data[uid])

    }

    /**
     * 添加一个登入会话
     * @param {number} uid 用户ID
     * @param {string} token 用户登入凭证
     */
    #addLoginSession(uid, token, _cache_data = this.#login_data) {
        return this.makeResult(this.#updateLoginSession(uid, token, _cache_data))
    }

    /**
     * 更新一个登入会话
     * @param {string} session_of 
     */
    #refreshLoginSession(session_of, _cache_data = this.#login_data, _cache_data_users = this.#config_data) {
        // 刷新登入会话
        const result = this.makeResult

        const { uid } = this.splitSession(session_of) // 解析Session字符串
        const token = this.#getProfile(uid, _cache_data_users)?.auth?.token
        if (!token) return result('user_not_found') // 用户不存在

        return result(this.#updateLoginSession(uid, token, _cache_data)) // 更新Session
    }


    /**
     * 通过session获取登入是否有效
     * @param {string} session_of
     */
    #getLoginValidBySession(session_of, _cache_data = this.#login_data) {
        const { uid, session } = this.splitSession(session_of) // 解析Session字符串

        const session_info = _cache_data[uid]
        const result = this.makeResult

        if (!session_info) return result('session_not_found') // 是否存在
        // log.debug('session', session_info.session, '; of', session)
        if (!(session_info.session === session)) return result('session_is_invalid') // 是否有效
        if ((session_info.time + this.config.login_valid_time) < this.timestamp) return result('session_is_expired') // 是否过期

        return result(session_info)
    }


    /**
     * (关联于`joinSession`方法)解析一个Session字符串
     * @param {string} session_of 
     * @returns {{uid: number, session: string}}
     */
    splitSession(session_of) {
        const session_data = session_of.split('-')
        return {
            uid: session_data[0], // 用户ID
            session: session_data[1], // 用户Session
        }
    }

    /**
     * 拼接一个Session字符串, 以便于存储
     * @param {number} uid 
     * @param {string} session 
     */
    joinSession(uid, session) {
        return `${uid}-${session}` // 连接成一个Session字符串
    }



    // -- get user content --

    /**
     * 通过用户名获取uid
     * @param {string} username_of 
     * @returns {string | null}
     */
    #searchUIDByName(username_of, _cache_data = this.#config_data) {
        let uid_of = null
        this.#forEachUser((user_item, uid) => {
            if (user_item.name === username_of) {
                uid_of = uid
                return true
            }
        }, _cache_data)
        return uid_of
    }


    /**
     * 获取指定ID的用户信息
     * @param {string} uid 
     */
    #getProfile(uid, _cache_data = this.#config_data) {
        const target_user = _cache_data.users[uid]
        return target_user ? target_user : null
    }

    /**
     * 通过用户名获取用户信息
     * @param {string} username 
     */
    #getProfileByName(username, _cache_data = this.#config_data) {
        const uid = this.#searchUIDByName(username, _cache_data)
        if (!uid) return null
        return this.#getProfile(uid, _cache_data)
    }

    // -- change user content --

    /**
     * 向配置文件内修改一个用户持久存储
     * @param {number} uid 
     * @param {UserProfile} new_config 
     * @param {UsersData} _cache_data 传入缓存对象将使用该对象作为数据源
     * @returns {number} 返回用户uid, 若用户创建失败返回0
     */
    #updateUserConfig(uid, new_config, _cache_data = this.#config_data) {
        const org_config = _cache_data
        const timestamp = this.timestamp
        const { users } = org_config
        const target_user = users[uid]
        // (old block)~250612
        // users[uid] = {
        //     ...user_config,
        //     time: {
        //         modify: timestamp
        //     }
        // }
        users[uid] = tool.updateObjs(
            this.#default_profile, //   default profile
            target_user, //             old profile
            new_config, //               new profile
            { time: { modify: timestamp } }
        )
        this.#config_data = org_config
    }

    /**
     * 遍历每个用户
     * @param {(user_item: UserProfile, uid: string) => Boolean} handler 处理函数返回是否停止遍历
     */
    #forEachUser(handler, _cache_data = this.#config_data) {
        const users_data = _cache_data.users

        for_user: for (const uid in users_data) {
            const user_item = users_data[uid]
            const make_stop = handler(user_item, uid)
            if (make_stop) break for_user
        }
    }



    // -- result data --

    /**
     * 输出一个用户的完整信息
     * @param {number} uid 
     */
    outProfile(uid, { _cache_data = this.#config_data, org_full_data = null } = {}) {
        const user_data = org_full_data || this.#getProfile(uid, _cache_data)
        if (!user_data) return null
        return {
            ...user_data,
            auth: null,
            uid,
            session: this.joinSession(uid, this.#getLoginSession(uid).value.session)
        }
    }

    // ------ Helper Method ------

    /**
     * 返回一个结果对象
     * @param {string | object} value 传入错误讯息(为字符)或结果(为对象)
     * @returns {{message: string, valid: boolean, value: object}}
     */
    makeResult(value = '') {
        if (value?._is_confirm) return value
        let valid = (typeof (value) === 'object') ? true : !value
        return {
            valid,
            message: valid ? '' : value,
            value: valid ? value : {},
            _is_confirm: true
        }
    }



    test() {
        log.debug('test code start')
        // test command here...
        // log.obj(this.#getProfileByName('Quper'))
        log.obj(this.login({ 'username': 'Quper', 'password': 'Quper233' }))

        log.debug('test code done')
    }

    // ------ Other Methods ------
    /**
     * 获取当前时间戳(单位秒)
     */
    get timestamp() {
        return Math.floor(this.timestamp_ms / 1000)
    }

    /**
     * 获取当前时间戳(单位毫秒)
     */
    get timestamp_ms() {
        return new Date().getTime()
    }
}

const user_config = new UserConfig()

// 将User对象暴露在外, 提供对于User的所有操作, 保持UserConfig和其实例不被暴露

/**
 * 实例化一个User对象, 通过构造该类进行登入
 */
export class User {
    /**当前实例状态 */
    #state = {
        /**是否登入 */
        is_login: false,
        /**登入时间 */
        time_login: 0,
        /**是否在临时登入列表中 */
        have_session: false,
    }

    /**用户凭证 */
    auth = {
        username: '',
        password: '',
        session: '',
        uid: 0
    }

    /**
     * 
     * @param {object} param0 
     * @param {string} param0.session 当使用session尝试登入该实例时, 将会忽略其他登入凭证
     * @param {string} param0.username
     * @param {string} param0.password
     * @param {number} param0.uid
     */
    constructor({ session, username, password, uid }) {
        this.auth = {
            session,
            username,
            password,
            uid
        }

        // try login

    }

    // getter

    get is_login() {
        return this.#state.is_login
    }

    // method
    login() {
        const result = user_config.login(...this.auth)
        if (!result.success) return
    }
}

// test code here ...

// user_config.test()
// console.log(user_config.login({username: 'Quper', password: '12345678'}))
// console.log(user_config.login({ session_of: '1001-9d6d061b1a3bb1a0cef1f14874ca28413ddab97a5232797e6a16beffbb314d90' }))
// console.log(user_config.outProfile(1001))
// log.debug(user_config.isValidUserProfile('username', 'Quper'))
// ~(last)用户实例携带的用户数据体