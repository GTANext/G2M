import {ref, type Ref, computed} from 'vue'

export function useWebAPI() {

    const getAppAlert = () => {
        return  {
            type: 'info',
            text: '即将发布alpha版...',
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