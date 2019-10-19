import React, { useEffect } from 'react';
import { Form } from 'antd';
import { FormComponentProps, FormCreateOption } from 'antd/es/form';
import { content } from './formChildrenDealer';
import { FormProps, value } from './formChildrenDealer';

interface FormOnly<T> {
  onSubmit: (values: T) => value;
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
  class DmForm<P> extends React.Component<
    FormProps<T> & FormComponentProps & React.PropsWithChildren<P>
  > {
    constructor(
      props: FormProps<T> & FormComponentProps & React.PropsWithChildren<P>
    ) {
      super(props);
      this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      const {
        form: { validateFields }
      } = this.props;
      e.preventDefault();
      validateFields((err: string, values: T) => {
        if (!err) {
          if (actions) actions.onSubmit(field2Obj(values, true));
        }
      });
    }

    render() {
      const { form, children } = this.props;

      return (
        <Form
          labelCol={{
            xs: { span: 24 },
            sm: { span: 6 }
          }}
          wrapperCol={{
            xs: { span: 24 },
            sm: { span: 18 }
          }}
          onSubmit={this.handleSubmit}
        >
          {content({ ...{ form, children } })}
        </Form>
      );
    }
  }

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
    onValuesChange(_: any, values: any) {}
  })(DmForm);
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
export function obj2Field(obj: any, preName = '') {
  let data = {} as any;
  if (obj.constructor === Array) {
    const preFix = preName === '' ? '' : preName + '_';
    for (const v in obj) {
      if (obj.hasOwnProperty(v)) {
        data = { ...data, ...obj2Field(obj[v], preFix + genHash()) };
      }
    }
  } else if (obj.constructor === Object) {
    const preFix = preName === '' ? '' : preName + '$';
    for (const v in obj) {
      if (obj.hasOwnProperty(v)) {
        data = { ...data, ...obj2Field(obj[v], preFix + v) };
      }
    }
  } else {
    data[preName] = { value: obj };
  }
  return data;
}

/**
 * 按层获取path信息
 * @param name
 */
function nameDealer(name = '') {
  const curr = name.match(/^[^_\$]+/);
  const rmedCurr = name.replace(/^[^_\$]+/, '');
  const symbol = rmedCurr.match(/^[_\$]/);
  const nextLevelName = rmedCurr.replace(/^[_\$]/, '');
  return {
    name,
    curr: (curr && curr[0]) || '',
    symbol: symbol && symbol[0],
    nextLevelName
  };
}

/**
 * field转换为对象
 * @param field 传入filed对象
 * @param getValue 为true将filed转换为js对象，为false时输出以js对象的方式输出field中的名字
 * @param container 新容器
 * @param currName 当前名字
 */
function _field2Obj(
  field: any,
  getValue: boolean,
  container = {},
  currName = ''
) {
  let obj: any; // 本层容器
  const keys = Object.keys(field).sort((a, b) => a.localeCompare(b));
  if (container.constructor === Array) {
    obj = [];
  } else if (container.constructor === Object) {
    obj = {};
  }
  let nextField = {} as any; // 下层容器

  keys.forEach((v, index) => {
    const { curr, symbol, nextLevelName } = nameDealer(v);
    const nextCurr = nameDealer(keys[index + 1] || '').curr;
    if (symbol) {
      // 有后继 深入
      nextField[nextLevelName] = field[v];
      if (curr !== nextCurr || index === keys.length - 1) {
        // 本层不同
        if (symbol === '$') {
          // 对象
          if (obj.constructor === Array)
            obj.push(
              _field2Obj(nextField, getValue, {}, currName + curr + symbol)
            );
          else if (obj.constructor === Object) {
            if (obj[curr] === undefined) obj[curr] = {};
            obj[curr] = {
              ...obj[curr],
              ..._field2Obj(nextField, getValue, {}, currName + curr + symbol)
            };
          }
        } else if (symbol === '_') {
          // 数组
          if (obj.constructor === Array)
            obj.push(
              _field2Obj(nextField, getValue, [], currName + curr + symbol)
            );
          else if (obj.constructor === Object) {
            if (obj[curr] === undefined) obj[curr] = [];
            obj[curr] = [
              ...obj[curr],
              ..._field2Obj(nextField, getValue, [], currName + curr + symbol)
            ];
          }
        }
        nextField = {};
      }
    } else {
      // 无后继 直接赋值
      if (getValue) {
        if (obj.constructor === Array) obj.push(field[v]);
        else if (obj.constructor === Object) obj[curr] = field[v];
      } else {
        if (obj.constructor === Array) obj.push(currName + curr);
        else if (obj.constructor === Object) obj[curr] = currName + curr;
      }
    }
  });
  return obj;
}

/**
 * field转换为对象
 * @param field 传入filed对象
 * @param getValue 为true将filed转换为js对象，为false时输出以js对象的方式输出field中的名字
 */
export function field2Obj(field: any, getValue: boolean = true) {
  return _field2Obj(field, getValue);
}

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
      const matched1st = item.replace(new RegExp('^' + prefix + '[$_]'), '');
      const matched2nd = matched1st.replace(/^[^$_]+/, '').match(/^[$]/);
      if (
        (matched1st && matched1st.match(/^[^$_]+/)[0] !== newSum.curr) ||
        newSum.curr === undefined
      ) {
        newSum.curr = item
          .replace(new RegExp('^' + prefix + '[$_]'), '')
          .match(/^[^$_]+/)[0];
        if (matched2nd) newSum.answer = [...sum.answer, []];
      }

      if (matched2nd) {
        newSum.answer[newSum.answer.length - 1] = [
          ...newSum.answer[newSum.answer.length - 1],
          item
        ];
      } else newSum.answer = [...sum.answer, item];
      return newSum;
    }
  ).answer;
}
