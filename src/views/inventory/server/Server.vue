
<script>
/* eslint-disable camelcase */

import {
    ref, toRefs, computed, reactive,
} from '@vue/composition-api';
import _ from 'lodash';
import ServerTemplate, { serverSetup, eventNames } from '@/views/inventory/server/Server.template.vue';
import serverEventBus from '@/views/inventory/server/ServerEventBus';
import { mountBusEvent, tabIsShow } from '@/lib/compostion-util';
import {
    defaultAutocompleteHandler,
    getEnumValues, getFetchValues,
} from '@/components/organisms/search/query-search-bar/autocompleteHandler';
import { getAllPage } from '@/components/organisms/pagenations/toolset';
import { defaultQuery } from '@/lib/api/query';
import { AdminTableAPI, HistoryAPI } from '@/lib/api/table';
import { ChangeServerProject } from '@/lib/api/fetch';
import { useStore } from '@/store/toolset';
import fluentApi from '@/lib/fluent-api';

export default {
    name: 'Server',
    extends: ServerTemplate,
    setup(props, context) {
        // const inventory = fluentApi.inventory();
        // const cst = inventory.cloudServiceType().list();
        // console.debug(cst.debug());
        // console.debug(cst.execute());
        // const another = cst.setThisPage(2);
        // console.debug(another.execute());

        const serverEventNames = eventNames;
        serverEventNames.getServerList = 'getServerData';
        serverEventNames.tagConfirmEvent = 'ServerTagConfirmEvent';
        serverEventNames.tagResetEvent = 'resetTagEvent';
        serverEventNames.getServerAdmin = 'requestAdmin';

        serverEventNames.inServiceServer = 'inServiceServer';
        serverEventNames.maintenanceServer = 'maintenanceServer';
        serverEventNames.closedServer = 'closedServer';
        serverEventNames.deleteServer = 'deleteServer';

        class ACHandler extends defaultAutocompleteHandler {
        // eslint-disable-next-line class-methods-use-this
            get keys() {
                return [
                    'server_id', 'name', 'state', 'primary_ip_address', 'server_type', 'os_type', 'project_id',
                    'data.os.os_arch', 'data.os.os_details', 'data.os.os_version',
                    'data.base.memory', 'data.base.core', 'data.platform.type',
                    'data.compute.instance_name', 'data.compute.keypair', 'data.compute.instance_id',
                    'collection_info.state',
                ];
            }

            // eslint-disable-next-line class-methods-use-this
            get suggestKeys() {
                return ['server_id', 'name', 'primary_ip_address'];
            }

            // eslint-disable-next-line class-methods-use-this
            get parent() {
                return context.parent;
            }

            // eslint-disable-next-line class-methods-use-this
            get valuesFetchUrl() {
                return '/inventory/server/list';
            }

            // eslint-disable-next-line class-methods-use-this
            get valuesFetchKeys() {
                return [
                    'server_id', 'name', 'primary_ip_address',
                    'data.compute.instance_name', 'data.compute.instance_id',
                    'data.vm.vm_name', 'data.vm.vm_id',
                ];
            }

            // eslint-disable-next-line no-shadow
            constructor() {
                super();
                this.handlerMap.value.push(...[
                    getEnumValues('state', ['PENDING', 'INSERVICE', 'MAINTENANCE', 'CLOSED', 'DELETED']),
                    getEnumValues('os_type', ['LINUX', 'WINDOWS']),
                    getEnumValues('collection_info.state', ['MANUAL', 'ACTIVE', 'DISCONNECTED']),
                    getEnumValues('server_type', ['BAREMETAL', 'VM', 'HYPERVISOR', 'UNKNOWN']),
                    getFetchValues('project_id', '/identity/project/list', this.parent),
                ]);
            }
        }

        const state = serverSetup(
            props,
            context,
            serverEventNames,
            new ACHandler(),
            new ChangeServerProject(),
        );
        const projectStore = context.parent.$ls.project;

        projectStore.getProject();
        const matchProject = (items) => {
            const result = items.map((item) => {
                try {
                    item.project = item.project_id ? projectStore.state.projects[item.project_id] || item.project_id : '';
                } catch (e) {
                    item.project = item.project_id;
                }
                return item;
            });
            return result;
        };

        const numberTypeKeys = new Set(['data.base.memory', 'data.base.core']);
        const valueFormatter = (key, value) => {
            if (numberTypeKeys.has(key)) {
                try {
                    return Number(value);
                } catch (e) {
                    return value;
                }
            }
            return value;
        };

        // request server list
        // const requestState = reactive({
        //     query: computed(() => (defaultQuery(
        //         state.thisPage, state.pageSize,
        //         state.sortBy, state.sortDesc, null,
        //         state.queryListTools.tags, valueFormatter,
        //     ))),
        // });
        const requestServerList = async () => {
            console.debug('before', state.loading);
            state.loading = true;
            state.items = [];
            let api = fluentApi.inventory().server().list();
            api = api.setThisPage(state.thisPage).setPageSize(state.pageSize).setSortBy(state.sortBy).setSortDesc(state.sortDesc);
            api = api.setFilter(...state.queryListTools.tags);
            try {
                api.debug();
                const res = await api.execute();
                state.items = matchProject(res.data.results);
                state.allPage = getAllPage(res.data.total_count, state.pageSize);
                state.selectIndex = [];
                state.loading = false;
            } catch (e) {
                console.error(e);
                state.loading = false;
            }
        };
        mountBusEvent(serverEventBus, serverEventNames.getServerList, requestServerList);


        // change tag
        const ServerTagConfirm = async (serverId, tags, originTags) => {
            const idx = state.selectIndex[0];
            try {
                const res = await context.parent.$http.post('/inventory/server/update', {
                    server_id: serverId,
                    tags,
                });
                state.items[idx].tags = tags;
            } catch (e) {
                serverEventBus.$emit(serverEventNames.tagResetEvent);
                state.items[idx].tags = originTags;
                console.error(e);
            }
        };
        mountBusEvent(serverEventBus, serverEventNames.tagConfirmEvent, ServerTagConfirm);

        // get server admin data
        const requestAdminState = reactive({
            query: computed(() => (defaultQuery(
                state.admin.thisPage, state.admin.pageSize,
                state.admin.sortBy, state.admin.sortDesc,
                state.admin.searchText,
            ))),
        });


        const requestServerAdmin = async () => {
            console.debug(state.getSelectServerIds);
            state.admin.loading = true;
            state.admin.items = [];
            const res = await context.parent.$http.post('/inventory/server/member/list', {
                query: requestAdminState.query,
                servers: state.getSelectServerIds,
            });
            state.admin.items = res.data.results;
            state.admin.allPage = getAllPage(res.data.total_count, state.admin.pageSize);
            state.admin.loading = false;
        };
        mountBusEvent(serverEventBus, serverEventNames.getServerAdmin, requestServerAdmin);


        const getServersParam = (items, changeState) => {
            console.debug(items);
            const result = { servers: _.map(items, 'server_id') };
            if (changeState) {
                result.state = changeState;
            }
            return result;
        };
        const maintenanceServer = async (items) => {
            await context.parent.$http.post('/inventory/server/change-state', getServersParam(items, 'MAINTENANCE')).then(async (_) => {
                await requestServerList();
                context.root.$notify({
                    group: 'noticeBottomRight',
                    type: 'success',
                    title: 'success',
                    text: 'maintenance servers',
                    duration: 2000,
                    speed: 1000,
                });
            }).catch((error) => {
                console.error(error);
                context.root.$notify({
                    group: 'noticeBottomRight',
                    type: 'alert',
                    title: 'Fail',
                    text: 'request Fail',
                    duration: 2000,
                    speed: 1000,
                });
            });
        };
        mountBusEvent(serverEventBus, serverEventNames.maintenanceServer, maintenanceServer);

        const closedServer = async (items) => {
            await context.parent.$http.post('/inventory/server/change-state', getServersParam(items, 'CLOSED')).then(async (_) => {
                await requestServerList();
                context.root.$notify({
                    group: 'noticeBottomRight',
                    type: 'success',
                    title: 'success',
                    text: 'closed servers',
                    duration: 2000,
                    speed: 1000,
                });
            }).catch((error) => {
                console.error(error);
                context.root.$notify({
                    group: 'noticeBottomRight',
                    type: 'alert',
                    title: 'Fail',
                    text: 'request Fail',
                    duration: 2000,
                    speed: 1000,
                });
            });
        };
        mountBusEvent(serverEventBus, serverEventNames.closedServer, closedServer);

        const inServiceServer = async (items) => {
            await context.parent.$http.post('/inventory/server/change-state', getServersParam(items, 'INSERVICE')).then(async (_) => {
                await requestServerList();
                context.root.$notify({
                    group: 'noticeBottomRight',
                    type: 'success',
                    title: 'success',
                    text: 'in-service servers',
                    duration: 2000,
                    speed: 1000,
                });
            }).catch((error) => {
                console.error(error);
                context.root.$notify({
                    group: 'noticeBottomRight',
                    type: 'alert',
                    title: 'Fail',
                    text: 'request Fail',
                    duration: 2000,
                    speed: 1000,
                });
            });
        };
        mountBusEvent(serverEventBus, serverEventNames.inServiceServer, inServiceServer);

        const deleteServer = async (items) => {
            await context.parent.$http.post('/inventory/server/delete', getServersParam(items)).then(async (_) => {
                await requestServerList();
                context.root.$notify({
                    group: 'noticeBottomRight',
                    type: 'success',
                    title: 'success',
                    text: 'delete servers',
                    duration: 2000,
                    speed: 1000,
                });
            }).catch((error) => {
                console.error(error);
                context.root.$notify({
                    group: 'noticeBottomRight',
                    type: 'alert',
                    title: 'Fail',
                    text: 'request Fail',
                    duration: 2000,
                    speed: 1000,
                });
            });
        };
        mountBusEvent(serverEventBus, serverEventNames.deleteServer, deleteServer);

        requestServerList();

        const adminParams = computed(() => ({
            servers: state.getSelectServerIds,
        }));
        // todo: move server.vue
        const adminIsShow = computed(() => {
            let result = false;
            if (state.isSelectedOne) {
                result = state.activeTab === 'admin';
            } if (state.isSelectedMulti) {
                result = state.multiSelectActiveTab === 'admin';
            }
            return result;
        });
        const adminApiHandler = new AdminTableAPI('/inventory/server/member/list', adminParams, undefined, undefined, undefined, undefined, adminIsShow);

        const historyIsShow = computed(() => {
            let result = false;
            if (state.isSelectedOne && state.activeTab === 'history') {
                result = true;
            }
            return result;
        });
        const selectId = computed(() => state.getFirstSelectServerId);
        const historyAPIHandler = new HistoryAPI('/inventory/server/get-data', 'server_id', selectId, undefined, undefined, undefined, historyIsShow);
        return {
            ...toRefs(state),
            adminApiHandler,
            historyAPIHandler,
        };
    },
};
</script>
