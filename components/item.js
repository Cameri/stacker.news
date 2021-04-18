import Link from 'next/link'
import UpVote from '../svgs/lightning-arrow.svg'
import styles from './item.module.css'
import { timeSince } from '../lib/time'

export default function Item ({ item, children }) {
  return (
    <>
      <div className={styles.item}>
        <UpVote width={24} height={24} className={styles.upvote} />
        <div className={styles.hunk}>
          <div className={`${styles.main} flex-wrap flex-md-nowrap`}>
            <Link href={`/items/${item.id}`} passHref>
              <a className={`${styles.title} text-reset flex-md-fill flex-md-shrink-0 mr-2`}>{item.title}</a>
            </Link>
            {item.url && <a className={styles.link} href={item.url}>{item.url.replace(/(^\w+:|^)\/\//, '')}</a>}
          </div>
          <div className={styles.other}>
            <span>{item.sats} sats</span>
            <span> \ </span>
            <Link href={`/items/${item.id}`} passHref>
              <a className='text-reset'>{item.ncomments} comments</a>
            </Link>
            <span> \ </span>
            <Link href={`/@${item.user.name}`} passHref>
              <a>@{item.user.name}</a>
            </Link>
            <span> </span>
            <span>{timeSince(new Date(item.createdAt))}</span>
          </div>
        </div>
      </div>
      {children && (
        <div className={styles.children}>
          {children}
        </div>
      )}
    </>
  )
}
