import {ref, type Ref, computed} from 'vue'

export function useWebAPI() {
    const openGitHub = () => {
        window.open('https://github.com/GTANext', '_blank')
    }

    const openGitHubRepository = () => {
        window.open('https://github.com/GTANext/ModLoader', '_blank')
    }

    return {
        openGitHub,
        openGitHubRepository
    }
}