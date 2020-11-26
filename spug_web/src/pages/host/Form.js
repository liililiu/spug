/**
 * Copyright (c) OpenSpug Organization. https://github.com/openspug/spug
 * Copyright (c) <spug.dev@gmail.com>
 * Released under the AGPL-3.0 License.
 */
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react';
import { ExclamationCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { Modal, Form, Input, Select, Button, Upload, message } from 'antd';
import { http, X_TOKEN } from 'libs';
import store from './store';

export default observer(function () {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [password, setPassword] = useState();
  const [fileList, setFileList] = useState([]);

  useEffect(() => {
    if (store.record.pkey) {
      setFileList([{uid: '0', name: '独立密钥', data: store.record.pkey}])
    }
  }, [])

  function handleSubmit() {
    setLoading(true);
    const formData = form.getFieldsValue();
    formData['id'] = store.record.id;
    const file = fileList[0];
    if (file && file.data) formData['pkey'] = file.data;
    http.post('/api/host/', formData)
      .then(res => {
        if (res === 'auth fail') {
          if (formData.pkey) {
            message.error('独立密钥认证失败')
          } else {
            setLoading(false)
            Modal.confirm({
              icon: <ExclamationCircleOutlined/>,
              title: '首次验证请输入密码',
              content: <ConfirmForm username={formData.username}/>,
              onOk: () => handleConfirm(formData),
            })
          }
        } else {
          message.success('操作成功');
          store.formVisible = false;
          store.fetchRecords()
        }
      }, () => setLoading(false))
  }

  function handleConfirm(formData) {
    if (password) {
      formData['password'] = password;
      return http.post('/api/host/', formData).then(res => {
        message.success('验证成功');
        store.formVisible = false;
        store.fetchRecords()
      })
    }
    message.error('请输入授权密码')
  }

  const ConfirmForm = (props) => (
    <Form layout="vertical" style={{marginTop: 24}}>
      <Form.Item required label="授权密码" help={`用户 ${props.username} 的密码， 该密码仅做首次验证使用，不会存储该密码。`}>
        <Input.Password onChange={e => setPassword(e.target.value)}/>
      </Form.Item>
    </Form>
  )

  function handleUploadChange(v) {
    if (v.fileList.length === 0) {
      setFileList([])
    }
  }

  function handleUpload(file, fileList) {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    http.post('/api/host/parse/', formData)
      .then(res => {
        file.data = res;
        setFileList([file])
      })
      .finally(() => setUploading(false))
    return false
  }

  const info = store.record;
  return (
    <Modal
      visible
      width={800}
      maskClosable={false}
      title={store.record.id ? '编辑主机' : '新建主机'}
      okText="验证"
      onCancel={() => store.formVisible = false}
      confirmLoading={loading}
      onOk={handleSubmit}>
      <Form form={form} labelCol={{span: 6}} wrapperCol={{span: 14}} initialValues={info}>
        <Form.Item required name="zone" label="主机类别">
          <Select placeholder="请选择主机类别/区域/分组">
            {store.zones.map(item => (
              <Select.Option value={item} key={item}>{item}</Select.Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item required name="name" label="主机名称">
          <Input placeholder="请输入主机名称"/>
        </Form.Item>
        <Form.Item required label="连接地址" style={{marginBottom: 0}}>
          <Form.Item name="username" style={{display: 'inline-block', width: 'calc(30%)'}}>
            <Input addonBefore="ssh" placeholder="用户名"/>
          </Form.Item>
          <Form.Item name="hostname" style={{display: 'inline-block', width: 'calc(40%)'}}>
            <Input addonBefore="@" placeholder="主机名/IP"/>
          </Form.Item>
          <Form.Item name="port" style={{display: 'inline-block', width: 'calc(30%)'}}>
            <Input addonBefore="-p" placeholder="端口"/>
          </Form.Item>
        </Form.Item>
        <Form.Item label="独立密钥" extra="默认使用全局密钥，如果上传了独立密钥则优先使用该密钥。">
          <Upload name="file" fileList={fileList} headers={{'X-Token': X_TOKEN}} beforeUpload={handleUpload}
                  onChange={handleUploadChange}>
            {fileList.length === 0 ? <Button loading={uploading} icon={<UploadOutlined/>}>点击上传</Button> : null}
          </Upload>
        </Form.Item>
        <Form.Item name="desc" label="备注信息">
          <Input.TextArea placeholder="请输入主机备注信息"/>
        </Form.Item>
        <Form.Item wrapperCol={{span: 14, offset: 6}}>
          <span role="img" aria-label="notice">⚠️ 首次验证时需要输入登录用户名对应的密码，但不会存储该密码。</span>
        </Form.Item>
      </Form>
    </Modal>
  )
})
