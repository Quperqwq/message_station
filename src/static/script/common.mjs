/**
 * Common.mjs
 * --------------------
 * create time: 260123
 * 
 * maker:       Quper
 * 
 */

/**
 * `Dom`对象及其方法集合
 */
export class Dom {
    /**
     * 获取Dom对象
     * @param {*} doms 要获取的`dom对象`
     * @param {Object} param1 配置获取行为
     * @param {Element | null} param1.target
     */
    constructor(doms, {
        target = document
    } = {}) {
        this.target = target
        
    }

    // ----  Query -----

    /**
     * 将字符串映射对象转换为`css`查询字符串
     * ```js
     * this.mapToQuery({'data-a': 'aaa'}) // => [data-a="aaa"]
     * ```
     * @param {Object.<string, string>} map 
     * ~(next) 增加选择器层级支持
     */
    toQueryString(map) {
        let result = ''
        for (const attr_name in map) {
            const attr_value = map[attr_name].replace('\"', '') // remove special char
            // attrib name: class
            //              apply class query rules
            if (attr_name === 'class') {
                result += `.${attr_value}`
                continue
            }
            const value = 
                attr_value ?
                `="${attr_value}"` :  // have value
                ''                  // void
            result += `[${attr_name}${value}]`
        }
        return result
    }

    toNormalQueryText(query) {
        if (typeof(query) === 'string') return query
        return this.toQueryString(query)
    }

    /**
     * 在目标上直接使用CSS选择器查询第一个匹配的`HTML`元素
     * @param {string} query 
     * @param {HTMLElement} base 
     */
    query(query, base = this.target) {
        return base.querySelector(query) || null
    }
    /**
     * 在目标上直接使用CSS选择器查询所有匹配的`HTML`元素
     * @param {string} query 
     * @param {HTMLElement} base 
     */
    queryAll(query, base = this.target) {
        return base.querySelectorAll(query) || null
    }

    /**
     * 在目标上使用标签表示查询第一个匹配的`HTML`元素
     * @param {string | object} query 
     * @param {HTMLElement} base 
     */
    tagQuery(query, base = this.target) {
        const element = base?.querySelector(this.toNormalQueryText(query))

        return element

    }

    /**
     * 在目标上使用标签表示查询所有匹配的`HTML`元素
     * @param {string | object} query 
     * @param {HTMLElement} base 
     */
    tagQueryAll(query, base = this.target) {
        const element = base?.querySelectorAll(this.toNormalQueryText(query))

        return element
    }

    /**
     * 在目标上按格式查找多个`HTML`元素并按格式返回
     * @param {*} doms 
     * @param {HTMLElement} base 
     * @param {number} __depth 
     */
    selectElements(doms, base = this.target, __depth = 0) {
        /**
         * 安全地进行本函数的递归
         * @param  {...any} args 
         */
        const doRecursive = (...args) => {
            // f() calling f() - depth added
            const curr_depth = __depth + 1
            return this.selectElements(...args, curr_depth)
        }
        /*
        `doms` format like:
        {
         element_1:   query,
         root:        query,
         element_2: {
           root:        last_element, <- here~(last)
           element2_1:  query,
         },
         _group_3:    {
           element_1_2: query,
         }
        }
        */
        /**@type {Object.<string, Object | HTMLElement | null>} */
        const result = {}
        let last_element = base

        for (const ref_name in doms) {
            const filter = doms[ref_name]
            if (!(typeof(filter) === 'string')) {
                // next base
                result[ref_name] = doRecursive(filter, last_element)
                continue
            }

            // current base
            if (ref_name[0] === '_') {
                // group - same base
                if (typeof(filter) === 'string') throw Error(`invalid value: '${filter}'; want Objet`) // want Object
                const group_name = ref_name.slice(1)
                result[group_name] = this.selectElements(doms, base) // do not use safe recursion
            }
            
            result[ref_name] = this.query(filter, base)
            last_element = result[ref_name]

        }

        return result
    }
}
