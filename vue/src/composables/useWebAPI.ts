import {ref, type Ref, computed} from 'vue'

export function useWebAPI() {

    const getAppAlert = () => {
        return  {
            type: 'info',
            text: '还在开发中! 如有疑问请加群: 829270254',
        }
        ;
    }

    const openGitHub = () => {
        window.open('https://github.com/GTANext', '_blank')
    }

    const openGitHubRepository = () => {
        window.open('https://github.com/GTANext/ModLoader', '_blank')
    }

    return {
        getAppAlert,
        openGitHub,
        openGitHubRepository
    }
}