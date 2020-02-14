import React, { useEffect, useState, useMemo, ReactText } from 'react';
import { Form } from 'antd';
import { FormComponentProps, FormCreateOption } from 'antd/es/form';
import { content } from './formChildrenDealer';
import { FormProps, value } from './formChildrenDealer';
import { start, pause, end } from './tools';

interface FormOnly<T> {
  onSubmit: (values: T) => value;
}

export const ARRAY_SEPARATOR = '[';
export const OBJECT_SEPARATOR = '{';
export const INDEX_NAME = '__idx__';

function Init<T>(actions?: FormProps<T> & FormOnly<T>) {
  class DmForm<P> extends React.PureComponent<
    FormProps<T> &
      FormComponentProps &
      React.PropsWithChildren<P> & { formData: any }
  > {
    constructor(
      props: FormProps<T> &
        FormComponentProps &
        React.PropsWithChildren<P> & { formData: any }
    ) {
      super(props);
      this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      const {
        form: { validateFields },
      } = this.props;
      e.preventDefault();
      validateFields((err: string, values: T) => {
        if (!err) {
          if (actions) actions.onSubmit(_field2Obj(values, 'onSubmit'));
        }
      });
    }

    render() {
      const { form, children, formData } = this.props;
      return (
        <Form
          labelCol={{
            xs: { span: 24 },
            sm: { span: 6 },
          }}
          wrapperCol={{
            xs: { span: 24 },
            sm: { span: 18 },
          }}
          onSubmit={this.handleSubmit}
        >
          {(() => {
            start('content');
            const answer = content({ ...{ form, children, formData } });
            pause('content');
            return answer;
          })()}
        </Form>
      );
    }
  }
  return DmForm;
}

export function beforeUseForm<T>(onSubmit?: Function) {
  // let _setFiled: Function = () => {};
  // let _onSubmit: Function = () => {};
  return Form.create({
    name: 'global_state',
    onFieldsChange(props: any, changedFields: any) {
      (props as any).onChange(changedFields);
    },
    mapPropsToFields(props: any) {
      // console.time('mapPropsToFields');
      const t: any = {};
      for (const i in props) {
        if (props.hasOwnProperty(i) && i !== 'children') {
          t[i] = Form.createFormField({ ...props[i] });
        }
      }
      // console.timeEnd('mapPropsToFields');
      return t;
    },
    onValuesChange(_: any, values: any) {},
  })(Init({ onSubmit } as any));
  // function(initialState: T, onSubmit: Function) {
  //   const [field, setfield] = useState(initialState);
  //   _onSubmit = onSubmit;
  //   _setFiled = setfield;
  //   return field;
  // }
}

/**
 * 初始化form的state，返回值同useState
 * @param arg 默认值
 */
export const useFormState = (arg?: any) => {
  return useState(useMemo(() => obj2Field(arg), []));
};

/**
 * 初始化onsubmit事件，返回form组件
 * @param onSubmit onsubmit事件
 */
export const useFormComponent = (onSubmit?: Function) => {
  return useMemo(() => beforeUseForm(onSubmit), []);
};

/**
 * 一步使用owlForm
 * @param initState 默认值
 * @param onSubmit onsubmit事件
 */
export function useOneStep(initState?: any, onSubmit?: Function) {
  start('use one step');
  // console.time('useOneStep1');
  const [formData, setFormData] = useFormState(initState || {});
  // console.timeEnd('useOneStep1');

  // console.time('useOneStep2');
  const MyForm = useFormComponent(onSubmit);
  // console.timeEnd('useOneStep2');

  // console.time('useOneStep3');
  const handleFormChange = (changedFields: any) => {
    setFormData({ ...formData, ...changedFields });
  };

  const fieldName = field2Obj(formData, false);

  const sortForm = (fieldName: any, l: number, r: number) => {
    setFormData(formSort(fieldName, l, r, formData));
  };

  const insertToArray = (fieldName: any, index: number, data: any) => {
    setFormData(insertToForm(fieldName, index, data, formData));
  };

  const removeItem = (dataPath: any) => {
    setFormData(rmFormItem(dataPath, fieldName, formData));
  };

  const setItem = (dataPath: any, data: any) => {
    setFormItem(dataPath, data, formData);
  };

  pause('use one step');

  // console.timeEnd('useOneStep3');
  return {
    formData,
    setFormData,
    MyForm,
    handleFormChange,
    fieldName,
    sortForm,
    insertToArray,
    removeItem,
    setItem,
  };
}

/**
 * 表单工厂
 * @param InitialForm 初始化表单
 * @param actions 事件
 */
export default function DmFormFactory<T>(
  // InitialForm?: T,
  actions?: FormProps<T> & FormOnly<T>
  // FormCreateOption?: FormCreateOption<any>
) {
  return Form.create({
    name: 'global_state',
    onFieldsChange(props: any, changedFields: any) {
      (props as any).onChange(changedFields);
    },
    mapPropsToFields(props: any) {
      const t: any = {};
      for (const i in props) {
        if (props.hasOwnProperty(i) && i !== 'children') {
          t[i] = Form.createFormField({ ...props[i] });
        }
      }
      return t;
    },
    onValuesChange(_: any, values: any) {},
  })(Init(actions));
}

type Name<T> = { [P in keyof T]: P }[keyof T];
type FieldToState2<T> = {
  [P in Name<T>]: T[P] extends Array<any>
    ? Array<FieldToState2<T[P]>>
    : {
        value: T[P];
      };
};
type fieldIniter = <T>(field: T) => FieldToState2<T>;

export const fieldIniter: fieldIniter = state => {
  let _state;
  if ((state as any).constructor === Array) {
    _state = [] as any;
  } else {
    _state = {} as any;
  }
  for (const name in state) {
    if ((state[name] as any).constructor === Array) {
      _state[name] = fieldIniter(state[name]);
    } else if ((state as Object).hasOwnProperty(name)) {
      if ((state[name] as any).constructor !== Array) {
        _state[name] = { value: state[name] };
      }
    }
  }
  return _state;
};

let count = 0;
export function genHash() {
  return count++;
}

/**
 * 对象转换为field
 * @param obj
 * @param preName
 */
export function obj2Field(obj: any, preName = '', index?: ReactText) {
  let data = {} as any;
  if (obj.constructor === Array) {
    const preFix = preName === '' ? '' : preName + ARRAY_SEPARATOR;
    for (const v in obj) {
      if (obj.hasOwnProperty(v)) {
        // console.log(v);
        data = { ...data, ...obj2Field(obj[v], preFix + v, v) };
      }
    }
  } else if (obj.constructor === Object) {
    const preFix = preName === '' ? '' : preName + OBJECT_SEPARATOR;
    for (const v in obj) {
      if (obj.hasOwnProperty(v)) {
        data = { ...data, ...obj2Field(obj[v], preFix + v, v) };
      }
    }
  } else {
    data[preName] = { value: obj, index };
  }
  return data;
}

/**
 * 按层获取path信息
 * @param name
 */
function nameDealer(name = '') {
  const currReg = new RegExp(`^[^\\${ARRAY_SEPARATOR}\\${OBJECT_SEPARATOR}]+`);
  const symbolReg = new RegExp(`^[\\${ARRAY_SEPARATOR}\\${OBJECT_SEPARATOR}]`);
  const curr = name.match(currReg);
  const rmedCurr = name.replace(currReg, '');
  const symbol = rmedCurr.match(symbolReg);
  const nextLevelName = rmedCurr.replace(symbolReg, '');
  return {
    name,
    curr: (curr && curr[0]) || '',
    symbol: symbol && symbol[0],
    nextLevelName,
  };
}

/**
 * field转换为对象
 * @param field 传入filed对象
 * @param getValue 为true将filed转换为js对象，为false时输出以js对象的方式输出field中的名字，onSubmit专门输出onsbumit回调的内容
 * @param container 新容器
 * @param currName 当前名字
 */
function _field2Obj(
  field: any,
  getValue: boolean | 'onSubmit',
  container = {},
  currName = ''
) {
  let obj: any; // 本层容器
  let keys = Object.keys(field);
  // const keys = Object.keys(field).sort((a, b) => a.localeCompare(b));

  // console.log(field, currName);

  if (container.constructor === Array) {
    obj = [];
    // 以下部分是field寄存index信息的操作，考虑废弃
    // const list = [] as Array<any>;
    // keys.forEach((item, index) => {
    //   console.log(item);
    //   list.push({ ...field[item], name: item, _index: index });
    // });
    // console.log(list);
    // const _list = list.sort((a: { index: string }, b: { index: string }) => {
    //   return parseInt(a.index) - parseInt(b.index);
    // });
    // keys = _list.map(item => item.name);
  } else if (container.constructor === Object) {
    obj = {};
  }
  if (!getValue)
    Object.defineProperty(obj, INDEX_NAME, {
      enumerable: false,
      configurable: false,
      writable: true,
      value: currName,
    });
  let nextField = {} as any; // 下层容器

  // console.log(keys);

  keys.forEach((v, index) => {
    const { curr, symbol, nextLevelName } = nameDealer(v);
    const nextCurr = nameDealer(keys[index + 1] || '').curr;
    if (symbol && symbol !== 'value') {
      // 有后继 深入
      nextField[nextLevelName] = field[v];
      if (curr !== nextCurr || index === keys.length - 1) {
        // 本层不同
        if (symbol === OBJECT_SEPARATOR) {
          // 对象
          const target = _field2Obj(
            nextField,
            getValue,
            {},
            currName + curr + symbol
          );
          if (!getValue) {
            Object.defineProperty(target, INDEX_NAME, {
              enumerable: false,
              configurable: false,
              writable: true,
              value: currName + curr,
            });
          }
          if (obj.constructor === Array) {
            obj.push(target);
          } else if (obj.constructor === Object) {
            if (obj[curr] === undefined) obj[curr] = {};
            obj[curr] = {
              ...obj[curr],
              ...target,
            };
          }
        } else if (symbol === ARRAY_SEPARATOR) {
          // 数组
          const target = _field2Obj(
            nextField,
            getValue,
            [],
            currName + curr + symbol
          );
          if (obj.constructor === Array) {
            Object.defineProperty(target, INDEX_NAME, {
              enumerable: false,
              configurable: false,
              writable: true,
              value: currName + curr,
            });
            obj.push(target);
          } else if (obj.constructor === Object) {
            if (obj[curr] === undefined) obj[curr] = [];
            const _target = [...obj[curr], ...target];
            Object.defineProperty(_target, INDEX_NAME, {
              enumerable: false,
              configurable: false,
              writable: true,
              value: currName + curr,
            });
            obj[curr] = _target;
          }
        }
        nextField = {};
      }
    } else {
      // 无后继 直接赋值
      if (getValue === true) {
        if (obj.constructor === Array && field[v]) obj.push(field[v].value);
        else if (obj.constructor === Object && field[v])
          obj[curr] = field[v].value;
      } else if (getValue === 'onSubmit') {
        if (obj.constructor === Array && field[v]) obj.push(field[v]);
        else if (obj.constructor === Object && field[v]) obj[curr] = field[v];
      } else {
        if (obj.constructor === Array) obj.push(currName + curr);
        else if (obj.constructor === Object) obj[curr] = currName + curr;
      }
    }
  });
  // console.log(field, obj);
  return obj;
}

/**
 * field转换为对象
 * @param field 传入filed对象
 * @param getValue 为true将filed转换为js对象，为false时输出以js对象的方式输出field中的名字
 */
export function field2Obj(field: any, getValue: boolean = true) {
  start('field2Obj');
  const answer = _field2Obj(field, getValue);
  pause('field2Obj');
  return answer;
}

const symbolHeadReg = new RegExp(
  `^[^\\${OBJECT_SEPARATOR}\\${ARRAY_SEPARATOR}]+`
);
const objectHead = new RegExp(`^[\\${OBJECT_SEPARATOR}]`);

/**
 * 分解数组
 * @param list
 * @param prefix
 */
export function list(list: any, prefix: string) {
  const keys1 = Object.keys(list)
    .sort((a, b) => a.localeCompare(b))
    .filter(item => item.match(new RegExp('^' + prefix)));

  return ([{ curr: undefined, answer: [] }, ...keys1] as any).reduce(
    (sum: any, item: any) => {
      const newSum = { ...sum };
      const matched1st = item.replace(
        new RegExp(
          '^' + prefix + `[\\${OBJECT_SEPARATOR}\\${ARRAY_SEPARATOR}]`
        ),
        ''
      );
      const matched2nd = matched1st
        .replace(symbolHeadReg, '')
        .match(objectHead);
      if (
        (matched1st && matched1st.match(symbolHeadReg)[0] !== newSum.curr) ||
        newSum.curr === undefined
      ) {
        newSum.curr = item
          .replace(
            new RegExp(
              '^' + prefix + `[\\${OBJECT_SEPARATOR}\\${ARRAY_SEPARATOR}]`
            ),
            ''
          )
          .match(symbolHeadReg)[0];
        if (matched2nd) newSum.answer = [...sum.answer, []];
      }

      if (matched2nd) {
        newSum.answer[newSum.answer.length - 1] = [
          ...newSum.answer[newSum.answer.length - 1],
          item,
        ];
      } else newSum.answer = [...sum.answer, item];
      return newSum;
    }
  ).answer;
}

const matchSeparator = new RegExp(
  '[^\\' + ARRAY_SEPARATOR + '\\' + OBJECT_SEPARATOR + ']+$'
);

/**
 * form排序
 * @param l 之前的位置
 * @param r 之后的位置
 * @param formData formData
 */
export function formSort(basePath: any, l: number, r: number, formData: any) {
  let _formData = { ...formData };
  for (let i = l < r ? l : l - 1; ; ) {
    if (
      basePath[i][INDEX_NAME] === undefined ||
      basePath[i + 1][INDEX_NAME] === undefined
    ) {
      const tmp = _formData[basePath[i]];
      _formData[basePath[i]] = _formData[basePath[i + 1]];
      _formData[basePath[i + 1]] = tmp;
    } else {
      const leftPrefix = basePath[i][INDEX_NAME];
      const rightPrefix = basePath[i + 1][INDEX_NAME];
      const leftIndex = leftPrefix.match(matchSeparator);
      const rightIndex = rightPrefix.match(matchSeparator);
      const prefix = rightPrefix.replace(matchSeparator, '');
      _formData = exchangeData(prefix, leftIndex[0], rightIndex[0], _formData);
    }
    if (l < r) i++;
    else i--;
    if (l < r && i >= r) break;
    else if (l > r && i < r) break;
  }

  return _formData;
}

function splitName(whole: string, pre: string) {
  const index = whole
    .replace(pre, '')
    .replace(
      new RegExp('[\\${OBJECT_SEPARATOR}\\${ARRAY_SEPARATOR}][\\S]+$'),
      ''
    );
  return [pre, index, whole.replace(pre + index, '')];
}

/**
 * 交换data，交换过程有副作用的操作，输出没有
 * @param leftPrefix
 * @param leftIndex
 * @param rightIndex
 * @param _formData
 */
function exchangeData(
  leftPrefix: string,
  leftIndex: string,
  rightIndex: string,
  formData: any
) {
  const _formData = { ...formData };
  const prefix = new RegExp(
    '^' +
      leftPrefix.replace(
        new RegExp(`[\\${OBJECT_SEPARATOR}\\${ARRAY_SEPARATOR}]`, 'g'),
        (item: string) => '\\' + item
      ) +
      leftIndex
  );
  Object.keys(formData).forEach(item => {
    if (item.match(prefix)) {
      const [pre, mid, end] = splitName(item, leftPrefix);
      const tmp = _formData[pre + (leftIndex + '') + end];
      _formData[pre + (leftIndex + '') + end] =
        _formData[pre + (rightIndex + '') + end];
      _formData[pre + (rightIndex + '') + end] = tmp;
    }
  });
  return _formData;
}

/**
 * 截断path
 * @param dataPath
 */
function genNames(dataPath: string) {
  const reg = /\]\[|\]\.|[\[\]\.]/g;
  return { names: dataPath.split(reg), types: dataPath.match(reg) || [] };
}

/**
 * 截断path
 * @param dataPath
 */
function genPath(dataPath: string) {
  const { names, types } = genNames(dataPath);
  let path = '';
  if (types) {
    names.forEach((item, index) => {
      path += item +=
        (types[index] &&
          (types[index].match(/\[$/) ? ARRAY_SEPARATOR : OBJECT_SEPARATOR)) ||
        '';
    });
  }
  return path;
}

/**
 * 设置form条目的值
 * @param dataPath
 * @param data
 * @param formData
 */
export function setFormItem(dataPath: any, data: any, formData: any) {
  let path = genPath(dataPath);
  if (data.constructor === Object || data.constructor === Array) {
    let separator = OBJECT_SEPARATOR;
    if (data.constructor === Array) {
      separator = ARRAY_SEPARATOR;
    }
    const target = {} as any;
    Object.keys(data).forEach(item => {
      target[path + separator + item] = { value: data[item] };
    });
    return target;
  } else {
    const target = {} as any;
    target[path] = { value: data };
  }
}

/**
 * 删除指定item
 * @param dataPath
 * @param fieldName
 * @param formData
 */
export function rmFormItem(dataPath: any, fieldName: any, formData: any) {
  dataPath = dataPath[INDEX_NAME] ? dataPath[INDEX_NAME] : dataPath;
  let _formData = { ...formData };
  const { names, types } = genNames(dataPath);

  if (types[types.length - 1] === ARRAY_SEPARATOR) {
    const lastName = dataPath.replace(
      new RegExp(`\\${ARRAY_SEPARATOR}\\d$`),
      ''
    );
    const [...nameWithoutLastOne] = names;
    nameWithoutLastOne.pop();
    const target = [fieldName, ...nameWithoutLastOne].reduce(
      (pre, cur) => pre[cur]
    );
    if (
      target.length > 1 &&
      (names[names.length - 1] as any) - 0 !== target.length - 1
    ) {
      _formData = formSort(
        target,
        (names[names.length - 1] as any) - 0,
        target.length - 1,
        _formData
      );
      dataPath = lastName + types[types.length - 1] + (target.length - 1);
    }
  }

  const path = genPath(dataPath);
  const newData = {} as any;
  const pathRegExp = path.replace(
    new RegExp(`[\\${OBJECT_SEPARATOR}\\${ARRAY_SEPARATOR}]`, 'g'),
    item => '\\' + item
  );

  const reg = new RegExp(
    `^${pathRegExp}$|^${pathRegExp}[\\${OBJECT_SEPARATOR}\\${ARRAY_SEPARATOR}]`
  );
  Object.keys(_formData).forEach(item => {
    // console.log(item.match(reg), item);
    // if (!item.match(new RegExp('^' + pathRegExp + '$'))) {
    if (!item.match(reg)) {
      newData[item] = _formData[item];
    }
  });
  return newData;
}

/**
 * 插入数据到数组中
 * @param dataPath
 * @param index
 * @param data
 * @param formData
 */
export function insertToForm(
  dataPath: any,
  index: number,
  data: any,
  formData: any
) {
  if (index < 0) throw 'The parameter `index` can NOT less than 0!';
  const maxLen = dataPath.length;
  index = maxLen < index ? maxLen : index;
  const _dataPath = dataPath[INDEX_NAME] + ARRAY_SEPARATOR + maxLen;

  const _formData = { ...formData, ...setFormItem(_dataPath, data, formData) };
  if (maxLen === index) return _formData;
  const fieldName = field2Obj(_formData, false);
  const targetPath = [
    fieldName,
    ...dataPath[INDEX_NAME].split(
      new RegExp(`\\${ARRAY_SEPARATOR}|\\${OBJECT_SEPARATOR}`, 'g')
    ),
  ].reduce((pre, curr) => pre[curr]);
  return formSort(targetPath, maxLen, index, _formData);
}

let __index__ = 0;
function indexGenerator() {
  return __index__++;
}

function toIndexed(obj: any, store: any, answer: any = {}) {
  const keys = Object.keys(obj);

  for (const i of keys) {
    let target = {};
    const indexName = indexGenerator();

    if (obj[i].constructor === Object) {
      target = toIndexed(obj[i], store, {});
    } else if (obj[i].constructor === Array) {
      target = toIndexed(obj[i], store, []);
    }
    store[indexName] = obj[i];

    Object.defineProperty(target, INDEX_NAME, {
      enumerable: false,
      configurable: false,
      writable: true,
      value: indexName,
    });

    answer[i] = target;
  }
  return answer;
}

function tostore(index: any, store: any, answer: any = {}) {
  const keys = Object.keys(index);
  for (const i of keys) {
    let target;

    if (index[i].constructor === Object && Object.keys(index[i]).length !== 0) {
      answer[i] = tostore(index[i], store, {});
    } else if (
      index[i].constructor === Array &&
      Object.keys(index[i]).length !== 0
    ) {
      answer[i] = tostore(index[i], store, []);
    } else {
      answer[i] = store[index[i][INDEX_NAME]];
    }
  }
  return answer;
}

function changestore(
  index: any,
  path: Array<string | number>,
  store: any,
  data: any
) {
  const curr = [index, ...path].reduce((sum, curr) => sum[curr]);
  const _index = curr[INDEX_NAME];
  store[_index] = data;
}

if (false) {
  const store = {};
  const origin = { a: { d: 'x' }, b: [1, 2, 3], c: 'w' };
  const index = toIndexed(origin, store);
  console.log(index);
  console.log(store);
  console.error('>>>>>>>>>>>>>>>>>>>>>>>');
  console.log(tostore(index, store));

  console.error('-----------------------');
  console.log('排序测试');
  const store1 = {};
  const origin1 = { arr: [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] };
  const index1 = toIndexed(origin1, store1);
  const _index1 = {
    arr: index1.arr.sort((a: any, b: any) => b[INDEX_NAME] - a[INDEX_NAME]),
  };
  console.log(
    index1.arr,
    _index1.arr,
    origin1.arr,
    tostore(_index1, store1).arr
  );
  console.log('排序用索引');

  console.error('=======================');
  console.log('修改数据');
  const store2 = {};
  const origin2 = { arr: [4, 2, 1, 3] };
  const index2 = toIndexed(origin2, store2);
  changestore(index2, ['arr', 2], store2, 5);
  console.log(tostore(index2, store2));

  console.error('<<<<<<<<<<<<<<<<<<<<<<<');

  const store3 = {};
  const origin3 = { arr: [4, 2, 1, 3] };
  const index3 = toIndexed(origin3, store3);
}

// sublime text 你......
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
