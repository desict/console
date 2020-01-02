<template>
    <div class="collector-page">
        <p-horizontal-layout>
            <template #container="{ height }">
                <p-toolbox-table
                    ref="toolbox"
                    :items="items"
                    :fields="fields"
                    :selectable="true"
                    :sortable="true"
                    :dragable="true"
                    :hover="true"
                    :responsive="true"
                    :sort-by.sync="sortBy"
                    :sort-desc.sync="sortDesc"
                    :all-page="allPage"
                    :this-page.sync="thisPage"
                    :select-index.sync="selectIndex"
                    :page-size.sync="pageSize"
                    :responsive-style="{'height': height+'px', 'overflow-y':'auto', 'overflow-x':'auto'}"
                    :setting-visible="false"
                    :loading="loading"
                    :use-spinner-loading="true"
                    :use-cursor-loading="true"
                    @changePageSize="getCollectors"
                    @changePageNumber="getCollectors"
                    @clickRefresh="getCollectors"
                    @changeSort="getCollectors"
                >
                    <template slot="toolbox-left">
                        <p-button style-type="primary">
                            Create
                        </p-button>
                        <PDropdownMenuBtn class="left-toolbox-item"
                                          :menu="dropdown"
                                          @clickMenuEvent="clickMenuEvent"
                        >
                            Action
                        </PDropdownMenuBtn>
                        <div class="left-toolbox-item">
                            <p-search :search-text.sync="searchText" @onSearch="getCollectors" />
                        </div>
                    </template>
                    <template #col-name-format="data">
                        <span class="name">
                            <img class="icon" :src="data.item.tags.icon || defaultImg">
                            {{ data.value }}
                        </span>
                    </template>
                    <template #col-state-format="data">
                        <p-status v-bind="collectorStateFormatter(data.value)" />
                    </template>
                    <template #col-last_collected_at-format="data">
                        {{ data.value ? timestampFormatter(data.value) : '' }}
                    </template>
                    <template #col-created_at-format="data">
                        {{ timestampFormatter(data.value) }}
                    </template>
                    <template #col-plugin_info-format="data">
                        <template v-if="data.value.options && data.value.options.supported_resource_type">
                            <div v-for="(d, i) in data.value.options.supported_resource_type" :key="i">
                                {{ d }}
                            </div>
                        </template>
                        <span v-else />
                    </template>
                </p-toolbox-table>
            </template>
        </p-horizontal-layout>
        <PTab v-if="isSelectedOne" :tabs="tabs" :active-tab.sync="activeTab">
            <template #detail>
                <collector-detail :item="items[selectIndex[0]]" />
            </template>
        </PTab>
    </div>
</template>

<script>
import {
    reactive, toRefs, computed,
} from '@vue/composition-api';
import { timestampFormatter, collectorStateFormatter } from '@/lib/util';
import { makeTrItems } from '@/lib/view-helper';
import collectorEventBus from '@/views/inventory/collector/CollectorEventBus';

import PI from '@/components/atoms/icons/PI';
import PStatus from '@/components/molecules/status/Status';
import PButton from '@/components/atoms/buttons/Button';
import config from '@/lib/config';

const PTab = () => import('@/components/organisms/tabs/tab/Tab');
const PHorizontalLayout = () => import('@/components/organisms/layouts/horizontal-layout/HorizontalLayout');
const PToolboxTable = () => import('@/components/organisms/tables/toolbox-table/ToolboxTable');
const PDropdownMenuBtn = () => import('@/components/organisms/dropdown/dropdown-menu-btn/DropdownMenuBtn');
const PSearch = () => import('@/components/molecules/search/Search');
const CollectorDetail = () => import('@/views/inventory/collector/modules/CollectorDetail');

const setCollectorTable = (props, context) => {
    const state = reactive({
        fields: makeTrItems([
            ['name', 'COMMON.NAME'],
            ['state', 'COMMON.STATE'],
            ['priority', 'COMMON.PRIORITY'],
            ['plugin_info', 'COMMON.RESOURCE'],
            ['last_collected_at', 'COMMON.LAST_COL'],
            ['created_at', 'COMMON.CREATED'],
        ],
        context.parent),
        selectIndex: [],
        items: [],
        loading: false,
        toolbox: null, // template refs
    });

    const getCollectors = () => {
        collectorEventBus.$emit('getCollectorList');
    };

    getCollectors();

    return {
        ...toRefs(state),
        getCollectors,
    };
};

const setTableToolbox = (props, context) => {
    const navigationState = reactive({
        sortBy: '',
        sortDesc: true,
        pageSize: 15,
        allPage: 1,
        thisPage: 1,
    });

    const state = reactive({
        dropdown: makeTrItems([
            ['update', 'COMMON.BTN_UPT'],
            [null, null, { type: 'divider' }],
            ['enable', 'COMMON.BTN_ENABLE'],
            ['disable', 'COMMON.BTN_DISABLE'],
            ['delete', 'COMMON.BTN_DELETE'],
            [null, null, { type: 'divider' }],
            ['collectData', 'COMMON.COLLECT'],
        ], context.parent,
        { type: 'item', disabled: false }),
        clickMenuEvent(menuName) {
            console.log(menuName);
        },
        searchText: '',
    });


    return {
        ...toRefs(navigationState),
        ...toRefs(state),
    };
};

const setTableData = (props, context) => {
    const state = reactive({
        timestampFormatter,
        collectorStateFormatter,
        defaultImg: config.get('COLLECTOR_IMG'),
    });
    return {
        ...toRefs(state),
    };
};

const setTabs = (props, context, tableState) => {
    const state = reactive({
        isSelectedOne: computed(() => tableState.selectIndex.value.length === 1),
        activeTab: 'detail',
    });
    return {
        ...toRefs(state),
    };
};

const setTabData = (props, context) => {
    const state = reactive({
        tabs: makeTrItems([
            ['detail', 'PANEL.DETAILS', { keepAlive: true }],
            ['credentials', 'PANEL.CREDENTIAL', { keepAlive: true }],
            ['jobs', 'PANEL.JOBS'],
        ], context.parent),
    });
    return {
        ...toRefs(state),
    };
};

export const collectorSetup = (props, context) => {
    const tableStates = setCollectorTable(props, context);
    const toolboxStates = setTableToolbox(props, context, tableStates);
    const tableDataStates = setTableData(props, context);
    const tabStates = setTabs(props, context, tableStates);
    const tabDataStates = setTabData(props, context);
    return {
        ...tableStates,
        ...toolboxStates,
        ...tableDataStates,
        ...tabStates,
        ...tabDataStates,
    };
};

export default {
    name: 'CollectorTemplate',
    components: {
        PI,
        PStatus,
        PHorizontalLayout,
        PToolboxTable,
        PButton,
        PDropdownMenuBtn,
        PTab,
        PSearch,
        CollectorDetail,
    },
    setup(props, context) {
        return collectorSetup(props, context);
    },
};
</script>

<style lang="scss" scoped>
    .collector-page {
        margin-top: 1.5625rem;
        margin-left: 2rem;
        margin-right: 2rem;

        .left-toolbox-item{
            margin-left: 1rem;
            &:last-child {
                flex-grow: 1;
            }
        }

        .name {
            .icon {
                width: 1.5rem;
                height: 1.5rem;
                margin-right: .5rem;
            }
        }

        ul {
            list-style-type: disc;
        }
        li {
            display: list-item;
        }
    }

</style>