import Fs from 'fs'
import {log} from './console-common.mjs'
import Path from 'path'

export class JSONData {
    /**
     * 
     * @param {string | string[]} file_path JSON文件路径
     * @param {Object} param1 
     * @param {boolean} [param1.mute_log=true] 是否不输出日志
     * @param {string} [param1.encoding='utf-8'] 指定编码格式
     * @param { () => void } [param1.on_reset] 当重置时触发回调
     * @param {Object} [param1.default_data] 数据体的默认值, 当值不可用或文件不存在时设定为该值
     */
    constructor(file_path, {mute_log = false, encoding = 'utf-8', default_data = {}, on_reset} = {}) {
        this.path = Array.isArray(file_path) ? Path.join(...file_path) : file_path // 将传入的path(对象的存储路径)归一化
        this._cache = null
        this._valid = false
        this.encoding = encoding
        this._log_header = `<JSONData '${file_path}'>`
        this.default_data = typeof(default_data) === 'object' ? default_data : null
        const callbacks = {
            reset: on_reset
        }
        /**
         * 触发回调函数
         * @param {string} callback_name 函数名
         */
        this._on = (callback_name = '', ...args) => {
            const callback = callbacks[callback_name]
            if (typeof(callback) === 'function') callback(...args)
        }

        const output = {
            error: (...cont) => {
                log.error(this._log_header, ...cont)
            },
            log: (...cont) => {
                log.info(this._log_header, ...cont)
            },
            debug: (...cont) => {
                log.debug(this._log_header, ...cont)
            }
        }

        
        if (mute_log) {
            // use mute log
            const mute_log = output
            Object.keys(output).forEach((method_name) => {
                mute_log[method_name] = () => {
                    // mute log code here...

                }
            })
            this.out = mute_log
        } else {
            // use output log
            this.out = output
        }
    }

    setDefault(default_data = this.default_data) {
        this._on('reset')
        this.set(default_data)
    }

    /**强制获取JSON对象 */
    get() {
        const {default_data, encoding} = this
        this.out.debug('data from file.')
        try {
            return JSON.parse(Fs.readFileSync(this.path, {
                encoding
            }))
        } catch (e) {
            if (default_data) { // 获取失败时重置
                this.setDefault()
            }
            this.out.error('get fail, error message of:', e)
            return default_data
        }
    }

    set(data) {
        try {
            Fs.writeFileSync(this.path, JSON.stringify(data), {
                encoding: this.encoding
            })
            return true
        } catch (e) {
            this.out.log('write fail, error message of:', e)
            return false
        }

    }

    get data() {
        if ((this._cache === null) || !this._valid) {
            this._cache = this.get()
            this._valid = true
        } else {
            this.out.debug('data from cache.')
        }
        
        return this._cache
    }

    set data(cont) {
        this.set(cont)
    }
}

export class Dir {
    constructor(path) {
        // ~(add)
    }
}