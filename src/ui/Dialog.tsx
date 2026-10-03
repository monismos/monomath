import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from '../App.module.css';
export function Dialog({title, children, onClose, wide=false}: {title:string;children:ReactNode;onClose:()=>void;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog=ref.current!; dialog.showModal(); return ()=>dialog.close();},[]);
  return <dialog ref={ref} className={`${styles.dialog} ${wide?styles.wide:''}`} onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}} aria-labelledby="dialog-title"><header><h2 id="dialog-title">{title}</h2><button className={styles.iconButton} aria-label="Close" onClick={onClose}><Icon name="X"/></button></header>{children}</dialog>;
}
