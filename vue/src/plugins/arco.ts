import ArcoVue from '@arco-design/web-vue';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';
import '@arco-design/web-vue/dist/arco.css';

export default function (app: any) {
    app.use(ArcoVue);
    app.use(ArcoVueIcon);
    document.body.setAttribute('arco-theme', 'dark');
}