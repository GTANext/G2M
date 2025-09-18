import os

class ModDetector:
    @staticmethod
    def detect_prerequisite_mods(game_directory):
        # 需要检测的两个前置mod
        required_mods = ['modloader.asi', 'cleo.asi']
        
        result = {
            'has_prerequisite': False,
            'location': None,
            'found_mods': [],
            'missing_mods': required_mods.copy(),
            'all_required_found': False,
            'found_mods_details': [],  # 详细记录每个找到的mod及其位置
            'checked_directories': []  # 记录检查过的目录
        }
        
        # 检查所有可能的目录
        directories_to_check = [
            ('根目录', game_directory),
            ('scripts目录', os.path.join(game_directory, 'scripts')),
            ('plugins目录', os.path.join(game_directory, 'plugins'))
        ]
        
        # 记录检查过的目录
        result['checked_directories'] = [name for name, path in directories_to_check]
        
        # 在所有目录中查找需要的mod
        for dir_name, directory_path in directories_to_check:
            if os.path.exists(directory_path) and os.path.isdir(directory_path):
                found_mods = ModDetector._check_directory_for_mods(directory_path, required_mods)
                
                # 记录找到的mod及其位置
                for mod in found_mods:
                    if mod not in result['found_mods']:
                        result['found_mods'].append(mod)
                    if mod in result['missing_mods']:
                        result['missing_mods'].remove(mod)
                    
                    # 记录详细信息
                    mod_detail = {
                        'mod_file': mod,
                        'directory_name': dir_name,
                        'directory_path': directory_path,
                        'full_path': os.path.join(directory_path, mod)
                    }
                    result['found_mods_details'].append(mod_detail)
        
        # 设置位置信息（如果找到了mod）
        if result['found_mods']:
            result['has_prerequisite'] = True
            # 记录找到mod的所有位置
            locations = list(set([detail['directory_name'] for detail in result['found_mods_details']]))
            result['location'] = ', '.join(locations) if locations else '未知位置'
        
        # 检查是否所有必需的mod都找到了
        result['all_required_found'] = len(result['missing_mods']) == 0
        
        return result
    
    @staticmethod
    def _check_directory_for_mods(directory, mod_list):
        found_mods = []
        
        if not os.path.exists(directory) or not os.path.isdir(directory):
            return found_mods
            
        for mod_file in mod_list:
            mod_path = os.path.join(directory, mod_file)
            if os.path.exists(mod_path) and os.path.isfile(mod_path):
                found_mods.append(mod_file)
                
        return found_mods