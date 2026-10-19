// Keep browser and Worker validation in sync. Passwords are never normalized.
export const NEW_PASSWORD_HINT='8文字以上で、英字と数字を両方含めてください';
export const normalizeLogin=login=>login.toLowerCase();
export function registrationIdError(login){return typeof login!=='string'||!login.length||/[^A-Za-z0-9]/.test(login)?'ユーザーIDは半角英字・数字で入力してください。':'';}
export function credentialError(mode,login,password){
 if(!['register','login','recover'].includes(mode))return '操作が不正です。';
 // Recovery identifies an existing account; it must accept legacy underscores.
 if(mode==='register'){const error=registrationIdError(login);if(error)return error;}
 else if(typeof login!=='string'||!login.length||/[^A-Za-z0-9_]/.test(login))return '登録したユーザーIDを入力してください。';
 if(typeof password!=='string'||!password.length)return 'パスワードを入力してください。';
 const length=[...password].length;
 if(length>128)return 'パスワードは128文字以内にしてください。';
 // Existing passwords need not satisfy the new registration policy.
 if(mode!=='login'&&(length<8||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password)))return NEW_PASSWORD_HINT+'。';
 return '';
}
