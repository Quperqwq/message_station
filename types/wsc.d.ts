// 请求和响应体

/**api请求体的标准样式 */
export interface ApiReqBody {
    /**请求内容 */
    [key: string]: any
    /**请求目标 */
    'target': string,

}

/**api响应体的标准样式 */
export interface ApiResBody {
    /**请求内容有效 */
    valid: boolean
    /**错误信息(如果适用的话) */
    message: void | string
    /**详细的错误信息 */
    message_det: void | string
    /**响应数据 */
    data: object | void
}
