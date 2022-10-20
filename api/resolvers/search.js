import { decodeCursor, LIMIT, nextCursorEncoded } from '../../lib/cursor'
import { getItem } from './item'

export default {
  Query: {
    search: async (parent, { q: query, sub, cursor, sort, what, when }, { me, models, search }) => {
      const decodedCursor = decodeCursor(cursor)
      let sitems

      const sortArr = []
      switch (sort) {
        case 'recent':
          sortArr.push({ createdAt: 'desc' })
          break
        case 'comments':
          sortArr.push({ ncomments: 'desc' })
          break
        case 'sats':
          sortArr.push({ sats: 'desc' })
          break
        case 'votes':
          sortArr.push({ upvotes: 'desc' })
          break
        default:
          break
      }
      sortArr.push('_score')

      const whatArr = []
      switch (what) {
        case 'posts':
          whatArr.push({ bool: { must_not: { exists: { field: 'parentId' } } } })
          break
        case 'comments':
          whatArr.push({ bool: { must: { exists: { field: 'parentId' } } } })
          break
        default:
          break
      }

      let whenGte
      switch (when) {
        case 'day':
          whenGte = 'now-1d'
          break
        case 'week':
          whenGte = 'now-7d'
          break
        case 'month':
          whenGte = 'now-30d'
          break
        case 'year':
          whenGte = 'now-365d'
          break
        default:
          break
      }

      try {
        sitems = await search.search({
          index: 'item',
          size: LIMIT,
          from: decodedCursor.offset,
          body: {
            query: {
              bool: {
                must: [
                  ...whatArr,
                  sub
                    ? { match: { 'sub.name': sub } }
                    : { bool: { must_not: { exists: { field: 'sub.name' } } } },
                  me
                    ? {
                        bool: {
                          should: [
                            { match: { status: 'ACTIVE' } },
                            { match: { status: 'NOSATS' } },
                            { match: { userId: me.id } }
                          ]
                        }
                      }
                    : {
                        bool: {
                          should: [
                            { match: { status: 'ACTIVE' } },
                            { match: { status: 'NOSATS' } }
                          ]
                        }
                      },
                  {
                    bool: {
                      should: [
                        {
                        // all terms are matched in fields
                          multi_match: {
                            query,
                            type: 'most_fields',
                            fields: ['title^20', 'text'],
                            minimum_should_match: '100%',
                            boost: 400
                          }
                        },
                        {
                          // all terms are matched in fields
                          multi_match: {
                            query,
                            type: 'most_fields',
                            fields: ['title^20', 'text'],
                            fuzziness: 'AUTO',
                            prefix_length: 3,
                            minimum_should_match: '100%',
                            boost: 20
                          }
                        },
                        {
                          // only some terms must match unless we're sorting
                          multi_match: {
                            query,
                            type: 'most_fields',
                            fields: ['title^20', 'text'],
                            fuzziness: 'AUTO',
                            prefix_length: 3,
                            minimum_should_match: sortArr.length > 1 ? '100%' : '60%'
                          }
                        }
                        // TODO: add wildcard matches for
                        // user.name and url
                      ]
                    }
                  }
                ],
                filter: {
                  range: {
                    createdAt: {
                      lte: decodedCursor.time,
                      gte: whenGte
                    }
                  }
                }
              }
            },
            sort: sortArr,
            highlight: {
              fields: {
                title: { number_of_fragments: 0, pre_tags: [':high['], post_tags: [']'] },
                text: { number_of_fragments: 0, pre_tags: [':high['], post_tags: [']'] }
              }
            }
          }
        })
      } catch (e) {
        console.log(e)
        return {
          cursor: null,
          items: []
        }
      }

      // return highlights
      const items = sitems.body.hits.hits.map(async e => {
        // this is super inefficient but will suffice until we do something more generic
        const item = await getItem(parent, { id: e._source.id }, { me, models })

        item.searchTitle = (e.highlight.title && e.highlight.title[0]) || item.title
        item.searchText = (e.highlight.text && e.highlight.text[0]) || item.text

        return item
      })

      return {
        cursor: items.length === LIMIT ? nextCursorEncoded(decodedCursor) : null,
        items
      }
    }
  }
}
