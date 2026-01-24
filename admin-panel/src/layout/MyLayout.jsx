import React from 'react';
import { Layout } from 'react-admin';
import { MyMenu } from './MyMenu';

import { MyAppBar } from './MyAppBar';

export const MyLayout = (props) => (
    <Layout {...props} menu={MyMenu} appBar={MyAppBar} />
);
