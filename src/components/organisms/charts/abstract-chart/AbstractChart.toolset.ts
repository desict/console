import Chart, {
    ChartDataSets, ChartOptions, ChartPluginsOptions, ChartTooltipOptions,
} from 'chart.js';
import {
    computed, reactive, Ref, watch, watchEffect,
} from '@vue/composition-api';
import { gray } from '@/styles/colors';
import { colorset } from '@/lib/util';
import {
    HelperToolSet, StateToolSet,
} from '@/lib/toolset';
import { UnwrapRef } from '@vue/composition-api/dist/reactivity';

export const abstractChartProps = {
    /**
     * This is for X axes
     */
    labels: {
        type: Array,
        default: undefined,
    },
    dataset: {
        type: Array,
        default: () => [],
    },
    type: {
        type: String,
        default: '',
    },
    loading: {
        type: Boolean,
        default: true,
    },
    styleType: {
        type: String,
        default: 'default',
    },
    colors: {
        type: Array,
        default: () => colorset,
    },
};

export class ChartData {
    label: string;

    data: number[];

    constructor(label: string, data: number[]) {
        this.label = label;
        this.data = data;
    }
}

export interface AbstractChartPropsType {
    type: string;
    labels?: string[];
    dataset: ChartData[];
    loading: boolean;
    styleType: string;
    colors: string[];
}

export interface ChartSettingsType<T extends AbstractChartPropsType = AbstractChartPropsType> {
    (props: T, chartRef: HTMLCanvasElement, index: number): ChartDataSets;
}

export interface ChartOptionsType<T extends AbstractChartPropsType = AbstractChartPropsType> {
    (props: T): ChartOptions;
}

export interface ChartPluginsType<T extends AbstractChartPropsType = AbstractChartPropsType> {
    (props: T): ChartPluginsOptions;
}

export interface ChartStyleGroupType<G> {
    default: G;
    [styleType: string]: G;
}


export const tooltips: ChartTooltipOptions = {
    cornerRadius: 2,
    caretSize: 6,
    caretPadding: 8,
    displayColors: false,
    backgroundColor: gray[900],
};

export const defaultSettings = (): ChartDataSets => ({});

export const defaultOptions = (): ChartOptions => ({});

export const defaultPlugins = (): ChartPluginsOptions => [{}];

@StateToolSet<AbstractChartPropsType>()
export class AbstractChartState<D extends AbstractChartPropsType = AbstractChartPropsType> {
    state: D;

    static initState(): AbstractChartPropsType {
        return {
            type: 'line',
            labels: [],
            dataset: [],
            loading: true,
            styleType: 'default',
            // @ts-ignore
            colors: colorset,
        };
    }

    constructor(props: D = {} as D, lazy = false) {
        this.state = props; // initReactive(lazy, AbstractChartState.initState(), initData);
    }
}

export interface ChartThemeType<T extends AbstractChartPropsType = AbstractChartPropsType> {
    settings: ChartSettingsType<T>;
    options: ChartOptionsType<T>;
    plugins: ChartPluginsType<T>;
}

export interface ChartThemeGroupType<T extends AbstractChartPropsType> {
    default: ChartThemeType<T>;
    [theme: string]: ChartThemeType<T>;
}


export const abstractChartThemes: ChartThemeGroupType<AbstractChartPropsType> = {
    default: {
        settings: defaultSettings,
        options: defaultOptions,
        plugins: defaultPlugins,
    },
};

export interface AbstractChartStateType {
    chartRef: HTMLCanvasElement | null;
    chart: Chart | null;
    options: Ref<ChartOptions> | Ref<Readonly<ChartOptions>>;
    plugins: Ref<ChartPluginsOptions> | Ref<Readonly<ChartPluginsOptions>>;
    datasets: Ref<ChartDataSets[]> | Ref<Readonly<ChartDataSets[]>>;
}

@HelperToolSet()
export class AbstractChartToolset<D extends AbstractChartPropsType = AbstractChartPropsType> extends AbstractChartState<D> {
    chartState: UnwrapRef<AbstractChartStateType>;

    // eslint-disable-next-line no-empty-function,@typescript-eslint/explicit-function-return-type
    static initToolSet() {}

    constructor(initData: D, themeGroup: ChartThemeGroupType<D> = abstractChartThemes) {
        super(initData);
        this.chartState = this.initChartState(themeGroup);

        // TODO: separate update logic and initiate logic
        watch(() => this.chartState.chartRef, (chartRef) => {
            if (chartRef) this.initChart();
        });
    }

    initChartState(themeGroup: ChartThemeGroupType<D>): UnwrapRef<AbstractChartStateType> {
        return reactive({
            chartRef: null,
            chart: null,
            options: computed(() => themeGroup[this.state.styleType].options(this.state)),
            plugins: computed(() => themeGroup[this.state.styleType].plugins(this.state)),
            datasets: computed(() => {
                if (this.chartState.chartRef) {
                    return this.state.dataset.map((d, i) => ({
                        label: d.label,
                        data: d.data,
                        borderColor: this.state.colors[i],
                        backgroundColor: this.state.colors[i],
                        // @ts-ignore
                        ...themeGroup[this.state.styleType].settings(this.state, this.chartState.chartRef, i),
                    }));
                }
                return [{}];
            }),
        });
    }

    initChart(): void {
        // @ts-ignore
        this.chartState.chart = new Chart(this.chartState.chartRef, {
            type: this.state.type,
            data: {
                labels: this.state.labels || new Array(this.state.dataset[0].data.length).fill(''),
                datasets: this.chartState.datasets,
            },
            options: this.chartState.options,
            plugins: this.chartState.plugins,
        });
    }
}