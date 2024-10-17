// https://prettier.io/docs/en/options.html

export default {
  $schema: 'https://json.schemastore.org/prettierrc',
  // js 中使用单引号
  singleQuote: true,
  // 多行对象等的最后一项行末加逗号
  trailingComma: 'es5',
  // 行最长 100
  printWidth: 100,
  // 行末加分号
  semi: true,
  // HTML多行元素属性左标签尖括号换行
  bracketSameLine: false,
  // 强制HTML元素单行单属性
  singleAttributePerLine: true,
  // vue单文件中script和style标签内不缩进
  vueIndentScriptAndStyle: false,
  // 行内元素和块元素都空格敏感
  htmlWhitespaceSensitivity: 'ignore',
};
