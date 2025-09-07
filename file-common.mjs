import Fs from 'fs'
import Path from 'path'

export class JSONData {
    /**
     * 
     * @param {string} path JSON文件路径
     * @param {Object} param1 
     * @param {boolean} [param1.mute_log=true] 是否不输出日志
     * @param {string} [param1.encoding='utf-8'] 指定编码格式
     */
    constructor(path, {mute_log = false, encoding = 'utf-8'} = {}) {
        this.path = path
        this._cache = null
        this._valid = false
        this.encoding = encoding
        this._log_header = '[JSONData]'

        const output = {
            error: (...cont) => {
                console.error(this._log_header, ...cont)
            },
            log: (...cont) => {
                console.log(this._log_header, ...cont)
            },
            debug: (...cont) => {
                console.debug(this._log_header, ...cont)
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

    

    /**强制获取JSON对象 */
    get() {
        this.out.debug('data from file.')
        try {
            return JSON.parse(Fs.readFileSync(this.path, {
                encoding: this.encoding
            }))
        } catch (e) {
            this.out.error('get fail, error message of:', e)
            return null
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
        try {
            Fs.writeFileSync(this.path, JSON.stringify(cont), {
                encoding: this.encoding
            })
        } catch (e) {
            this.out.log('write fail, error message of:', e)
        }
    }
}

export class Dir {
    constructor(path) {
        // ~(add)
    }
}