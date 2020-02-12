<template>
    <p-button-modal :header-title="tr('COMMON.PROFILE')"
                    centered
                    fade
                    backdrop
                    size="xl"
                    :footer-cancel-button-bind="{
                        styleType: 'dark',
                        outline: true,
                    }"
                    :footer-confirm-button-bind="{
                        styleType: 'primary-dark',
                    }"
                    :visible.sync="proxyVisible"
                    @confirm="onClickConfirm"
    >
        <template #body>
            <p-row class="profile-form" wrap="wrap">
                <p-col class="form-div" :col="6">
                    <p-field-group :label="tr('COMMON.ID')">
                        <br>
                        <p-text-input :value="userId" disabled block />
                    </p-field-group>
                    <p-field-group :label="tr('COMMON.EMAIL')">
                        <br>
                        <p-text-input :value="userState.email" disabled block />
                    </p-field-group>
                    <p-field-group :label="tr('COMMON.NAME')">
                        <br>
                        <p-text-input v-model="userState.name" block />
                    </p-field-group>
                    <p-field-group :label="tr('USER.PWD')"
                                   required
                                   :invalid-text="invalidMsg.password"
                                   :invalid="invalidState.password"
                    >
                        <template #default="{invalid}">
                            <p-text-input v-model="userState.password" block type="password"
                                          class="form-control"
                                          :class="{'is-invalid': invalid}"
                            />
                        </template>
                    </p-field-group>
                    <p-field-group :label="tr('USER.PWD_CHECK')"
                                   required
                                   :invalid-text="invalidMsg.passwordCheck"
                                   :invalid="invalidState.passwordCheck"
                    >
                        <template #default="{invalid}">
                            <p-text-input v-model="userState.passwordCheck" block type="password"
                                          class="form-control"
                                          :class="{'is-invalid': invalid}"
                            />
                        </template>
                    </p-field-group>
                </p-col>
                <p-col class="form-div" :col="6">
                    <p-field-group :label="tr('COMMON.PHONE')">
                        <br>
                        <p-text-input v-model="userState.mobile" block />
                    </p-field-group>
                    <p-field-group :label="tr('COMMON.GROUP')">
                        <br>
                        <p-text-input v-model="userState.group" block />
                    </p-field-group>
                    <p-field-group :label="tr('COMMON.LANGUAGE')">
                        <p-select-dropdown v-model="userState.language" :items="languages" auto-height />
                    </p-field-group>
                    <p-field-group :label="tr('COMMON.TIMEZONE')">
                        <p-select-dropdown v-model="userState.timezone" :items="timezones" auto-height />
                    </p-field-group>
                </p-col>
            </p-row>
        </template>
    </p-button-modal>
</template>

<script>
import { reactive, toRefs } from '@vue/composition-api';
import _ from 'lodash';
import moment from 'moment-timezone';
import {
    makeProxy, formValidation, lengthMinValidation, lengthMaxValidation, Validation, requiredValidation,
} from '@/lib/compostion-util';
import GNBEventBus from '@/views/containers/gnb/GNBEventBus';
import { LANGUAGES } from '@/lib/global-enums';

import PButtonModal from '@/components/organisms/modals/button-modal/ButtonModal.vue';
import PFieldGroup from '@/components/molecules/forms/field-group/FieldGroup.vue';
import PRow from '@/components/atoms/grid/row/Row.vue';
import PCol from '@/components/atoms/grid/col/Col.vue';
import PTextInput from '@/components/atoms/inputs/TextInput.vue';
import PDropdownMenuBtn from '@/components/organisms/dropdown/dropdown-menu-btn/DropdownMenuBtn.vue';
import PSelectDropdown from '@/components/organisms/dropdown/select-dropdown/SelectDropdown.vue';

class MenuItem {
    constructor(name, label) {
        this.name = name;
        this.label = label;
        this.type = 'item';
    }
}

export const profileSetup = (props, context) => {
    const userState = reactive({
        password: '',
        passwordCheck: '',
        name: '',
        email: '',
        mobile: '',
        group: '',
        language: '',
        timezone: '',
    });

    const updateUserValidations = {
        password: [lengthMinValidation(5), lengthMaxValidation(12)],
        passwordCheck: [
            new Validation((value, data) => data.password === value, 'please enter same value again'),
        ],
    };

    const state = reactive({
        proxyVisible: makeProxy('visible', props, context.emit),
        loading: true,
        userState,
        languages: context.root.$i18n.availableLocales.map(lang => (new MenuItem(lang, LANGUAGES[lang]))),
        timezones: moment.tz.names().map(tz => new MenuItem(tz, tz)),
        showValidation: false,
        ...formValidation(userState, updateUserValidations),
        async onClickConfirm() {
            state.showValidation = true;
            const result = await state.allValidation();
            if (!result) return;

            const params = {
                // eslint-disable-next-line camelcase
                user_id: props.userId,
                ...userState,
            };
            delete params.passwordCheck;
            console.log('props.authType', props.authType);
            debugger;
            GNBEventBus.$emit('updateUser', params);
            state.proxyVisible = false;
        },

    });

    return state;
};

export default {
    name: 'ProfileModalTemplate',
    components: {
        PSelectDropdown,
        PButtonModal,
        PFieldGroup,
        PTextInput,
        PRow,
        PCol,
    },
    props: {
        visible: Boolean,
        userId: String,
        authType: String,
    },
    setup(props, context) {
        // eslint-disable-next-line camelcase
        GNBEventBus.$emit('getUser', { user_id: props.userId });
        return {
            ...toRefs(profileSetup(props, context)),
        };
    },
};
</script>

<style lang="scss" scoped>
.profile-form {
    text-align: left;
    .form-div {
        padding: 0 1rem;
    }
    .dropdown {
        text-align: left;
    }
}
</style>