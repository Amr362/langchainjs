/**
 * @typedef {Object} ConnectorConfig
 * @property {string} name - اسم الموصل.
 * @property {string} description - وصف للموصل.
 * @property {Object} schema - مخطط Zod للتحقق من صحة المدخلات.
 * @property {Function} invoke - الدالة التي يتم استدعاؤها لتنفيذ مهمة الموصل.
 * @property {Function} [init] - دالة تهيئة اختيارية للموصل.
 * @property {Function} [shutdown] - دالة إغلاق اختيارية للموصل.
 */

/**
 * @interface Connector
 * يمثل واجهة أساسية للموصلات.
 */
class Connector {
  constructor(config) {
    if (!config.name || !config.description || !config.schema || !config.invoke) {
      throw new Error("يجب أن يحتوي الموصل على اسم، وصف، مخطط، ودالة invoke.");
    }
    this.name = config.name;
    this.description = config.description;
    this.schema = config.schema;
    this.invoke = config.invoke;
    this.init = config.init || (() => {});
    this.shutdown = config.shutdown || (() => {});
  }

  /**
   * تهيئة الموصل.
   * @returns {Promise<void>}
   */
  async initialize() {
    await this.init();
  }

  /**
   * تنفيذ مهمة الموصل.
   * @param {Object} input - المدخلات للموصل.
   * @returns {Promise<any>}
   */
  async execute(input) {
    return this.invoke(input);
  }

  /**
   * إغلاق الموصل.
   * @returns {Promise<void>}
   */
  async terminate() {
    await this.shutdown();
  }
}

export default Connector;
