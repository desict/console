<template>
    <div class="error">
        <div id="notfound">
            <div class="notfound">
                <div class="notfound-error">
                    <h1>Oops!</h1>
                </div>
                <h2>{{ errorMessage }}</h2><br>
                <p>Error code: {{ errorStatus }}</p><br>
            </div>
        </div>
    </div>
</template>

<script>
import { reactive, toRefs } from '@vue/composition-api';

export default {
    name: 'ErrorPage',
    setup() {
        const state = reactive({
            errorStatus: '404',
            errorMessage: 'Page Not Found',
        });

        return {
            ...toRefs(state),
        };
    },
};
</script>

<style lang="css" scoped>
    * {
        -webkit-box-sizing: border-box;
        box-sizing: border-box;
    }

    #notfound .notfound {
        position: absolute;
        left: 50%;
        top: 50%;
        -webkit-transform: translate(-50%, -50%);
        -ms-transform: translate(-50%, -50%);
        transform: translate(-50%, -50%);
    }

    .notfound {
        max-width: 410px;
        width: 100%;
        text-align: center;
    }

    .notfound .notfound-error {
        height: 280px;
        position: relative;
        z-index: -1;
    }

    .notfound .notfound-error h1 {
        font-size: 230px;
        margin: 0px;
        font-weight: 900;
        position: absolute;
        left: 50%;
        -webkit-transform: translateX(-50%);
        -ms-transform: translateX(-50%);
        transform: translateX(-50%);
        -webkit-text-fill-color: transparent;
        background:url('~@/assets/images/redirect/error/bg.jpg') no-repeat;
        -webkit-background-clip: text;
        background-size: cover;
        background-position: center;
    }


    .notfound h2 {
        color: #000;
        font-size: 2rem;
        font-weight: 700;
        text-transform: uppercase;
        margin-top: 0;
    }

    .notfound p {
        font-size: 1.2rem;
        font-weight: 300;
    }


    @media only screen and (max-width: 767px) {
        .notfound .notfound-error {
            height: 142px;
        }
        .notfound .notfound-error h1 {
            font-size: 112px;
        }
    }
</style>
