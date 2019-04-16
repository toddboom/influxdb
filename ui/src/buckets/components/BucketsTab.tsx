// Libraries
import React, {PureComponent, ChangeEvent} from 'react'
import _ from 'lodash'
import {connect} from 'react-redux'

// Components
import {ErrorHandling} from 'src/shared/decorators/errors'
import {Input, Button, EmptyState} from '@influxdata/clockface'
import {Overlay, Tabs} from 'src/clockface'
import FilterList from 'src/shared/components/Filter'
import BucketList from 'src/buckets/components/BucketList'
import {PrettyBucket} from 'src/buckets/components/BucketRow'
import CreateBucketOverlay from 'src/buckets/components/CreateBucketOverlay'

// Actions
import {createBucket, updateBucket, deleteBucket} from 'src/buckets/actions'

// Utils
import {ruleToString} from 'src/utils/formatting'

// Types
import {Organization, BucketRetentionRules} from '@influxdata/influx'
import {
  IconFont,
  ComponentSize,
  ComponentColor,
  Sort,
} from '@influxdata/clockface'
import {OverlayState, AppState, Bucket} from 'src/types'

interface StateProps {
  org: Organization
  buckets: Bucket[]
}

interface DispatchProps {
  createBucket: typeof createBucket
  updateBucket: typeof updateBucket
  deleteBucket: typeof deleteBucket
}

export enum SortTypes {
  String = 'string',
}

interface State {
  searchTerm: string
  overlayState: OverlayState
  sortKey: SortKey
  sortDirection: Sort
  sortType: SortTypes
}

type Props = DispatchProps & StateProps

type SortKey = keyof PrettyBucket

@ErrorHandling
class BucketsTab extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props)

    this.state = {
      searchTerm: '',
      overlayState: OverlayState.Closed,
      sortKey: 'name',
      sortDirection: Sort.Ascending,
      sortType: SortTypes.String,
    }
  }

  public render() {
    const {org, buckets} = this.props
    const {
      searchTerm,
      overlayState,
      sortKey,
      sortDirection,
      sortType,
    } = this.state

    return (
      <>
        <Tabs.TabContentsHeader>
          <Input
            icon={IconFont.Search}
            placeholder="Filter buckets..."
            widthPixels={290}
            value={searchTerm}
            onChange={this.handleFilterChange}
            onBlur={this.handleFilterBlur}
          />
          <Button
            text="Create Bucket"
            icon={IconFont.Plus}
            color={ComponentColor.Primary}
            onClick={this.handleOpenModal}
            testID="Create Bucket"
          />
        </Tabs.TabContentsHeader>
        <FilterList<PrettyBucket>
          searchTerm={searchTerm}
          searchKeys={['name', 'ruleString', 'labels[].name']}
          list={this.prettyBuckets(buckets)}
        >
          {bs => (
            <BucketList
              buckets={bs}
              emptyState={this.emptyState}
              onUpdateBucket={this.handleUpdateBucket}
              onDeleteBucket={this.handleDeleteBucket}
              onFilterChange={this.handleFilterUpdate}
              sortKey={sortKey}
              sortDirection={sortDirection}
              sortType={sortType}
              onClickColumn={this.handleClickColumn}
            />
          )}
        </FilterList>
        <Overlay visible={overlayState === OverlayState.Open}>
          <CreateBucketOverlay
            org={org}
            onCloseModal={this.handleCloseModal}
            onCreateBucket={this.handleCreateBucket}
          />
        </Overlay>
      </>
    )
  }

  private handleClickColumn = (nextSort: Sort, sortKey: SortKey) => {
    const sortType = SortTypes.String
    this.setState({sortKey, sortDirection: nextSort, sortType})
  }

  private handleUpdateBucket = (updatedBucket: PrettyBucket) => {
    this.props.updateBucket(updatedBucket as Bucket)
  }

  private handleDeleteBucket = ({id, name}: PrettyBucket) => {
    this.props.deleteBucket(id, name)
  }

  private handleCreateBucket = async (bucket: Bucket): Promise<void> => {
    await this.props.createBucket(bucket)
    this.handleCloseModal()
  }

  private handleOpenModal = (): void => {
    this.setState({overlayState: OverlayState.Open})
  }

  private handleCloseModal = (): void => {
    this.setState({overlayState: OverlayState.Closed})
  }

  private handleFilterBlur = (e: ChangeEvent<HTMLInputElement>): void => {
    this.setState({searchTerm: e.target.value})
  }

  private handleFilterChange = (e: ChangeEvent<HTMLInputElement>): void => {
    this.handleFilterUpdate(e.target.value)
  }

  private handleFilterUpdate = (searchTerm: string): void => {
    this.setState({searchTerm})
  }

  private prettyBuckets(buckets: Bucket[]): PrettyBucket[] {
    return buckets.map(b => {
      const expire = b.retentionRules.find(
        rule => rule.type === BucketRetentionRules.TypeEnum.Expire
      )

      if (!expire) {
        return {
          ...b,
          ruleString: 'forever',
        }
      }

      return {
        ...b,
        ruleString: ruleToString(expire.everySeconds),
      }
    })
  }

  private get emptyState(): JSX.Element {
    const {searchTerm} = this.state

    if (_.isEmpty(searchTerm)) {
      return (
        <EmptyState size={ComponentSize.Large}>
          <EmptyState.Text
            text={`Looks like there aren't any Buckets, why not create one?`}
            highlightWords={['Buckets']}
          />
          <Button
            text="Create Bucket"
            icon={IconFont.Plus}
            color={ComponentColor.Primary}
            onClick={this.handleOpenModal}
          />
        </EmptyState>
      )
    }

    return (
      <EmptyState size={ComponentSize.Large}>
        <EmptyState.Text text="No Buckets match your query" />
      </EmptyState>
    )
  }
}

const mstp = ({buckets, orgs}: AppState): StateProps => {
  return {
    buckets: buckets.list,
    org: orgs.org,
  }
}

const mdtp = {
  createBucket,
  updateBucket,
  deleteBucket,
}

export default connect<StateProps, DispatchProps, {}>(
  mstp,
  mdtp
)(BucketsTab)
